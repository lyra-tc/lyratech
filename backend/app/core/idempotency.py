"""Turnstile-token idempotency: lets a request atomically claim a token so
a duplicate submit (double-click, network retry, direct API call) with the
same token is rejected instead of doing the work twice.
"""

import hashlib
from datetime import datetime, timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..models.used_turnstile_token import UsedTurnstileToken


def claim_turnstile_token(db: Session, token: str) -> bool:
    """Atomically claims a Turnstile token. Returns False if it was already
    claimed by another request (this or another uvicorn worker process).
    """
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    db.add(UsedTurnstileToken(token_hash=token_hash))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return False
    return True


def cleanup_old_turnstile_tokens(db: Session, max_age_days: int = 30) -> None:
    """Deletes claimed-token rows older than max_age_days. Housekeeping only —
    claims are checked in real time, this just keeps the table from growing
    unbounded over months/years.
    """
    cutoff = datetime.utcnow() - timedelta(days=max_age_days)
    db.query(UsedTurnstileToken).filter(UsedTurnstileToken.created_at < cutoff).delete()
    db.commit()
