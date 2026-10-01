from __future__ import annotations

import json
import urllib.error
import urllib.request
from http import HTTPStatus
from typing import Any

from .emails import Emails

VERSION = "0.1.0"
DEFAULT_BASE_URL = "https://api.sendiz.dev"


class SendizError(Exception):
    """Raised for any non-2xx response from the API."""

    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(f"sendiz: {status_code} {message}")
        self.status_code = status_code
        self.message = message


class Client:
    def __init__(
        self, api_key: str, *, base_url: str = DEFAULT_BASE_URL, timeout: float = 30.0
    ) -> None:
        if not api_key:
            raise ValueError("sendiz: api_key is required")
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self.emails = Emails(self)

    def _request(self, method: str, path: str, body: Any = None) -> Any:
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Accept": "application/json",
            "User-Agent": f"sendiz-python/{VERSION}",
        }
        data = None
        if body is not None:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"

        req = urllib.request.Request(
            self._base_url + path, data=data, headers=headers, method=method
        )
        try:
            with urllib.request.urlopen(req, timeout=self._timeout) as resp:
                raw = resp.read()
        except urllib.error.HTTPError as e:
            raise SendizError(e.code, _error_message(e)) from None
        return json.loads(raw) if raw else None


def _error_message(e: urllib.error.HTTPError) -> str:
    try:
        message = json.loads(e.read()).get("message")
    except (ValueError, AttributeError):
        message = None
    if isinstance(message, str) and message:
        return message
    try:
        return HTTPStatus(e.code).phrase
    except ValueError:
        return "Unknown error"
