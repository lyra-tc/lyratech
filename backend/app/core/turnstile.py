from typing import Optional
import httpx
from ..config import settings

TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def verify_turnstile_token(token: str, remote_ip: Optional[str] = None) -> bool:
    payload = {"secret": settings.TURNSTILE_SECRET_KEY, "response": token}
    if remote_ip:
        payload["remoteip"] = remote_ip

    try:
        response = httpx.post(TURNSTILE_VERIFY_URL, data=payload, timeout=5.0)
        response.raise_for_status()
    except httpx.HTTPError:
        return False

    return response.json().get("success", False)
