# Sendiz: Email Sending Flow

This document explains how Sendiz handles a batch of emails (for example, 1000) from the moment the `POST` request arrives until every email is sent or failed.

## Default settings

| Setting        | Default | Meaning                                        |
|----------------|---------|------------------------------------------------|
| `WORKER_COUNT` | 10      | Worker goroutines sending in parallel          |
| `MAX_ATTEMPTS` | 3       | Tries per email before giving up               |
| `RETRY_AFTER`  | 30s     | Wait before a failed or stuck email is retried |
| `SMTP_TIMEOUT` | 15s     | Longest a single SMTP send can take            |

## Flow diagram

```mermaid
flowchart TD
    A["Client sends POST with 1000 emails"] --> B["API inserts 1000 rows in Postgres<br/>status = queued, attempts = 0"]
    B --> C["API Enqueue: one pipeline of 1000 XADD commands<br/>each stream entry holds only email_id"]
    C -->|Redis error| C1["API updates those rows to failed<br/>returns 503"]
    C -->|ok| D["API returns 202 Accepted<br/>user does not wait"]
    C -->|1000 entries now in the Redis stream| F0

    subgraph FETCH["fetch loop: ONE goroutine, the only code that talks to Redis"]
        F0{"5 seconds since last reclaim?"}
        F0 -->|yes| F1["XAUTOCLAIM: take up to 10 entries<br/>pending longer than 30s<br/>from temporary failures or crashed workers"]
        F0 -->|no| F2
        F1 --> F2["XREADGROUP with '>': up to 10 NEW entries<br/>waits up to 2s if the stream is empty"]
        F2 --> F3["Redis records each entry as pending for this consumer<br/>no other consumer in the group receives it"]
        F3 --> F4["dispatch: pushes ONE message at a time into jobs<br/>blocks until some worker is free"]
        F4 --> F0
    end

    F4 --> CH["jobs channel, unbuffered<br/>each message is received by exactly one worker"]
    CH --> W1

    subgraph WORKERS["10 worker goroutines, each runs: for msg := range jobs"]
        W1["handle: read email_id from the message"]
        W1 -->|invalid id| ACK
        W1 -->|valid| W2["claim in Postgres, one atomic UPDATE:<br/>status = sending, attempts + 1<br/>only WHERE status = queued<br/>OR status = sending older than 30s"]
        W2 -->|0 rows updated| W3{"handleUnclaimed: current status?"}
        W3 -->|sent, failed, or row missing| ACK
        W3 -->|another worker is sending it| LEAVE["do nothing, leave it pending"]
        W2 -->|1 row updated, this worker owns it| W4{"attempts greater than 3?"}
        W4 -->|yes, earlier worker crashed on last try| FAIL
        W4 -->|no| W5["mailer.Send over SMTP"]
        W5 -->|250 accepted| SENT["UPDATE status = sent, sent_at = now"]
        W5 -->|5xx permanent, or 3rd attempt failed| FAIL["UPDATE status = failed, last_error saved"]
        W5 -->|4xx or timeout| RETRY["UPDATE status = queued, last_error saved<br/>NO ack, entry stays pending in Redis"]
        SENT --> ACK["ack: XACK + XDEL in Redis<br/>entry removed, nobody can take it again"]
        FAIL --> ACK
        ACK --> NEXT["worker goes back to jobs for its next email"]
        LEAVE --> NEXT
        RETRY --> NEXT
    end

    RETRY -.->|after 30s idle| F1
    NEXT --> CH
```

## Step by step

1. **API (`cmd/main.go`)**: saves every email in Postgres as `queued`, pushes their IDs into the Redis stream in one pipeline, and returns `202` right away.
2. **Fetch loop (`worker.fetch`)**: the only code that talks to Redis.
   - Every 5 seconds, `XAUTOCLAIM` takes back entries that have been pending longer than `RETRY_AFTER`, so they can be retried.
   - On every loop, `XREADGROUP` reads up to `WORKER_COUNT` new entries.
   - `dispatch` hands them to the workers one at a time through the `jobs` channel.
3. **Workers (`worker.handle`)**: `WORKER_COUNT` goroutines, and each one holds exactly one email at a time.
   - **Claim**: one atomic `UPDATE` sets `status = sending` and `attempts + 1`.
   - **Send**: sends the email over SMTP.
   - **Update Postgres**: sets `sent`, `failed`, or back to `queued` for a retry.
   - **Ack in Redis**: runs `XACK` and `XDEL` only after the database update succeeds.

## SMTP result handling

| SMTP result                  | Postgres update                   | Redis                                 |
|------------------------------|-----------------------------------|---------------------------------------|
| 250 accepted                 | `status = sent`, `sent_at = now`  | Ack and delete                        |
| 5xx permanent error          | `status = failed`, `last_error`   | Ack and delete                        |
| 4xx or timeout               | `status = queued`, `last_error`   | Left pending, retried after 30s       |
| Fails on the final attempt   | `status = failed`                 | Ack and delete                        |

A 250 reply means the SMTP server accepted the email, not that it reached the recipient's inbox.

## Why no two workers send the same email

1. **Redis consumer group**: `XREADGROUP` with `">"` gives each entry to only one consumer.
2. **Unbuffered `jobs` channel**: each message is received by exactly one worker goroutine, and only when that worker is free.
3. **Atomic claim in Postgres**: `UPDATE ... WHERE status = 'queued'` can match for only one worker. Any other worker gets 0 rows and does not send.

## Delivery guarantee

Workers always update Postgres **before** acknowledging in Redis. If the database update fails, the entry is not acknowledged and gets redelivered, so an email's status is never lost. The trade-off is that, rarely, an email could be sent twice. This is called at-least-once delivery.

## Graceful shutdown

On shutdown, the fetch loop stops, the `jobs` channel is closed, and each worker finishes the email it is currently sending before exiting. Emails that were not picked up yet stay in the Redis stream until the worker starts again.