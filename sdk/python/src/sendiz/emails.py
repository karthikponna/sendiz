from __future__ import annotations

import sys
from typing import TYPE_CHECKING, Literal, Optional
from urllib.parse import quote

if sys.version_info >= (3, 11):
    from typing import NotRequired, TypedDict
else:
    from typing_extensions import NotRequired, TypedDict

if TYPE_CHECKING:
    from .client import Client

# The most emails the API accepts in one request.
MAX_BATCH_SIZE = 100

EmailStatus = Literal["queued", "sending", "sent", "failed"]

# "from" is a Python keyword, so these use the functional TypedDict syntax.
SendEmailRequest = TypedDict(
    "SendEmailRequest",
    {
        "from": str,
        "to": str,
        "subject": str,
        "html": NotRequired[str],
        "text": NotRequired[str],
    },
)


class SendEmailResponse(TypedDict):
    id: str


Email = TypedDict(
    "Email",
    {
        "id": str,
        "from": str,
        "to": str,
        "subject": str,
        "html": NotRequired[str],
        "text": NotRequired[str],
        "status": EmailStatus,
        "attempts": int,
        "last_error": NotRequired[str],
        "sent_at": NotRequired[Optional[str]],
        "created_at": str,
        "updated_at": str,
    },
)


class Emails:
    def __init__(self, client: Client) -> None:
        self._client = client

    def send(self, email: SendEmailRequest) -> SendEmailResponse:
        """Queue one email. Returns as soon as it is queued; use get() to follow its status."""
        return self.send_batch([email])[0]

    def send_batch(self, emails: list[SendEmailRequest]) -> list[SendEmailResponse]:
        """Queue up to MAX_BATCH_SIZE emails in one request. IDs come back in the same order."""
        if not 1 <= len(emails) <= MAX_BATCH_SIZE:
            raise ValueError(
                f"sendiz: batch must contain 1 to {MAX_BATCH_SIZE} emails, got {len(emails)}"
            )
        resp = self._client._request("POST", "/email", {"emails": emails})
        data: list[SendEmailResponse] = resp["data"]
        return data

    def get(self, id: str) -> Email:
        """Return an email and its current delivery status."""
        email: Email = self._client._request("GET", f"/email/{quote(id, safe='')}")
        return email
