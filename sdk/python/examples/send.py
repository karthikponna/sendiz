"""Sends one email with the Sendiz Python SDK and waits until it is sent or fails.

SENDIZ_API_KEY=sdz_... uv run examples/send.py you@example.com
"""

import os
import sys
import time

import sendiz


def main() -> None:
    api_key = os.environ.get("SENDIZ_API_KEY")
    if not api_key:
        sys.exit("set SENDIZ_API_KEY to a key from the Sendiz dashboard")
    to = sys.argv[1] if len(sys.argv) > 1 else "delivered@example.com"

    client = sendiz.Client(
        api_key, base_url=os.environ.get("SENDIZ_BASE_URL", sendiz.DEFAULT_BASE_URL)
    )

    resp = client.emails.send(
        {
            "from": "Sendiz <onboarding@sendiz.dev>",
            "to": to,
            "subject": "Hello World",
            "html": "<p>Congrats on sending your <strong>first email</strong>!</p>",
        }
    )
    print("queued:", resp["id"])

    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        email = client.emails.get(resp["id"])
        if email["status"] == "sent":
            print(f"sent after {email['attempts']} attempt(s)")
            return
        if email["status"] == "failed":
            sys.exit(f"failed: {email.get('last_error', '')}")
        time.sleep(1)
    sys.exit("still not sent after 60s")


if __name__ == "__main__":
    main()
