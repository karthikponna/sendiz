# Sendiz Python SDK

Python client for the [Sendiz](https://sendiz.dev) email API. Python 3.9+, no required dependencies.

```bash
pip install sendiz
```

```python
import sendiz

client = sendiz.Client("sdz_...")  # API key from the dashboard

resp = client.emails.send({
    "from": "Sendiz <onboarding@sendiz.dev>",
    "to": "you@example.com",
    "subject": "Hello World",
    "html": "<p>Congrats on sending your <strong>first email</strong>!</p>",
})

email = client.emails.get(resp["id"])
print(email["status"])  # queued, sending, sent or failed
```

- `client.emails.send_batch([...])` queues up to 100 emails in one request.
- Errors from the API raise `sendiz.SendizError` with `status_code` and `message`.
- Use `sendiz.Client(key, base_url="http://localhost:8080")` for a local API.
