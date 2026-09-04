import logging
from typing import Optional

import httpx

from ..config import settings

logger = logging.getLogger(__name__)

RESEND_EMAIL_URL = "https://api.resend.com/emails/{id}"

_EVENT_MAP = {
    "delivered": "delivered",
    "opened": "delivered",
    "clicked": "delivered",
    "bounced": "bounced",
    "complained": "complained",
    "delivery_delayed": "delayed",
    "sent": "sent",
    "queued": "sent",
}


def fetch_delivery_status(email_id: str, timeout: float = 10.0) -> Optional[str]:
    """Query Resend for the current delivery state of one message.

    ``timeout`` is the per-request HTTP timeout in seconds passed to httpx.

    Returns a mapped status string, or None when it can't be determined
    (no API key, no id, 404, network/HTTP error, malformed body, unknown
    or absent event) -- callers keep whatever status they already have on None.
    Never raises.
    """
    if not settings.RESEND_API_KEY or not email_id:
        return None

    headers = {"Authorization": f"Bearer {settings.RESEND_API_KEY}"}
    try:
        response = httpx.get(
            RESEND_EMAIL_URL.format(id=email_id), headers=headers, timeout=timeout
        )
        if response.status_code != 200:
            return None
        payload = response.json()
    except (httpx.HTTPError, ValueError):
        logger.warning("Resend status lookup failed for %s", email_id, exc_info=True)
        return None

    if not isinstance(payload, dict):
        return None
    last_event = payload.get("last_event")
    if not isinstance(last_event, str):
        return None
    return _EVENT_MAP.get(last_event)
