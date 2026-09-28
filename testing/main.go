// Sends one HTML email and/or the same HTML email to many recipients at once, and waits
// until every email is sent or failed. See the Makefile for the usual commands.
//
//	SENDIZ_API_KEY=sdz_... go run . -mode single|batch|all [-to addr] [-batch n]
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	sendiz "github.com/karthikponna/sendiz/sdk/go"
)

const htmlBody = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:32px 0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr><td style="background:#151414;padding:24px 32px;">
            <h1 style="margin:0;color:#fffbf5;font-size:22px;">Sendiz</h1>
          </td></tr>
          <tr><td style="padding:32px;">
            <h2 style="margin:0 0 12px;font-size:20px;">It works!</h2>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
              This email went from the Go SDK to the Sendiz API, through the Redis queue,
              and out of a worker over SMTP.
            </p>
            <a href="http://localhost:5173/emails"
               style="display:inline-block;padding:12px 22px;background:#ff5e1f;color:#fffbf5;text-decoration:none;border-radius:999px;font-weight:bold;">
              View it in the dashboard
            </a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`

func main() {
	mode := flag.String("mode", "all", "what to send: single, batch, or all")
	to := flag.String("to", "test@example.com", "recipient of the single email")
	batchSize := flag.Int("batch", 50, "number of emails to send in batch mode")
	flag.Parse()

	if *mode != "single" && *mode != "batch" && *mode != "all" {
		log.Fatalf("unknown -mode %q (use single, batch, or all)", *mode)
	}
	if *batchSize < 1 {
		log.Fatal("-batch must be at least 1")
	}

	apiKey := os.Getenv("SENDIZ_API_KEY")
	if apiKey == "" {
		log.Fatal("set SENDIZ_API_KEY to a key from the dashboard (API keys page)")
	}
	opts := []sendiz.Option{}
	if baseURL := os.Getenv("SENDIZ_BASE_URL"); baseURL != "" {
		opts = append(opts, sendiz.WithBaseURL(baseURL))
	}
	client := sendiz.NewClient(apiKey, opts...)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	email := sendiz.SendEmailRequest{
		From:    "Sendiz <onboarding@sendiz.dev>",
		Subject: "Hello from the Sendiz test script",
		HTML:    htmlBody,
		Text:    "It works! This email was sent with the Sendiz Go SDK.",
	}

	if *mode == "single" || *mode == "all" {
		sendSingle(ctx, client, email, *to)
	}
	if *mode == "batch" || *mode == "all" {
		sendBatch(ctx, client, email, *batchSize)
	}
}

func sendSingle(ctx context.Context, client *sendiz.Client, email sendiz.SendEmailRequest, to string) {
	fmt.Println("== single email")
	email.To = to
	start := time.Now()
	resp, err := client.Emails.Send(ctx, &email)
	if err != nil {
		log.Fatalf("send: %v", err)
	}
	fmt.Printf("queued %s in %s\n", resp.ID, time.Since(start).Round(time.Millisecond))
	report(waitForAll(ctx, client, []string{resp.ID}), start)
}

// sendBatch sends n copies of the email to test+1@example.com … test+n@example.com,
// in requests of up to sendiz.MaxBatchSize (the API's per-request limit).
func sendBatch(ctx context.Context, client *sendiz.Client, email sendiz.SendEmailRequest, n int) {
	requests := (n + sendiz.MaxBatchSize - 1) / sendiz.MaxBatchSize
	fmt.Printf("\n== batch of %d emails in %d request(s)\n", n, requests)

	start := time.Now()
	ids := make([]string, 0, n)
	for offset := 0; offset < n; offset += sendiz.MaxBatchSize {
		size := min(sendiz.MaxBatchSize, n-offset)
		batch := make([]sendiz.SendEmailRequest, size)
		for i := range batch {
			batch[i] = email
			batch[i].To = fmt.Sprintf("test+%d@example.com", offset+i+1)
		}
		resps, err := client.Emails.SendBatch(ctx, batch)
		if err != nil {
			log.Fatalf("send batch: %v", err)
		}
		for _, r := range resps {
			ids = append(ids, r.ID)
		}
	}
	fmt.Printf("queued %d emails in %s\n", len(ids), time.Since(start).Round(time.Millisecond))
	report(waitForAll(ctx, client, ids), start)
}

// waitForAll polls until every email is sent or failed and returns the final statuses.
func waitForAll(ctx context.Context, client *sendiz.Client, ids []string) map[string]*sendiz.Email {
	done := make(map[string]*sendiz.Email, len(ids))
	var mu sync.Mutex

	for len(done) < len(ids) {
		var wg sync.WaitGroup
		sem := make(chan struct{}, 10)
		for _, id := range ids {
			mu.Lock()
			_, finished := done[id]
			mu.Unlock()
			if finished {
				continue
			}
			wg.Go(func() {
				sem <- struct{}{}
				defer func() { <-sem }()
				email, err := client.Emails.Get(ctx, id)
				if err != nil {
					log.Printf("get %s: %v", id, err)
					return
				}
				if email.Status == sendiz.StatusSent || email.Status == sendiz.StatusFailed {
					mu.Lock()
					done[id] = email
					mu.Unlock()
				}
			})
		}
		wg.Wait()

		if ctx.Err() != nil {
			log.Fatalf("gave up waiting: %d of %d finished", len(done), len(ids))
		}
		if len(done) < len(ids) {
			fmt.Printf("  %d/%d finished...\n", len(done), len(ids))
			time.Sleep(time.Second)
		}
	}
	return done
}

func report(results map[string]*sendiz.Email, start time.Time) {
	sent, failed := 0, 0
	for _, e := range results {
		if e.Status == sendiz.StatusSent {
			sent++
			continue
		}
		failed++
		fmt.Printf("  failed %s to %s: %s\n", e.ID, e.To, e.LastError)
	}
	fmt.Printf("sent %d, failed %d, all done %s after the request\n", sent, failed, time.Since(start).Round(time.Millisecond))
}
