"""Python client for the Sendiz email API.

import sendiz

client = sendiz.Client("sdz_...")
resp = client.emails.send({
    "from": "Acme <onboarding@sendiz.dev>",
    "to": "user@example.com",
    "subject": "Hello World",
    "html": "<strong>It works!</strong>",
})
"""

from .client import DEFAULT_BASE_URL, VERSION, Client, SendizError
from .emails import (
    MAX_BATCH_SIZE,
    Email,
    Emails,
    EmailStatus,
    SendEmailRequest,
    SendEmailResponse,
)

__version__ = VERSION

__all__ = [
    "DEFAULT_BASE_URL",
    "MAX_BATCH_SIZE",
    "Client",
    "Email",
    "EmailStatus",
    "Emails",
    "SendEmailRequest",
    "SendEmailResponse",
    "SendizError",
]
