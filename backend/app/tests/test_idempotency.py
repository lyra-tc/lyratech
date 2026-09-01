from datetime import datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.core.idempotency import claim_turnstile_token, cleanup_old_turnstile_tokens
from app.models.used_turnstile_token import UsedTurnstileToken


def _session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def test_claim_turnstile_token_succeeds_first_time():
    db = _session()
    assert claim_turnstile_token(db, "token-a") is True
    assert db.query(UsedTurnstileToken).count() == 1


def test_claim_turnstile_token_rejects_reuse():
    db = _session()
    assert claim_turnstile_token(db, "token-a") is True
    assert claim_turnstile_token(db, "token-a") is False
    assert db.query(UsedTurnstileToken).count() == 1


def test_claim_turnstile_token_allows_distinct_tokens():
    db = _session()
    assert claim_turnstile_token(db, "token-a") is True
    assert claim_turnstile_token(db, "token-b") is True
    assert db.query(UsedTurnstileToken).count() == 2


def test_cleanup_removes_only_tokens_older_than_max_age():
    db = _session()
    old = UsedTurnstileToken(
        token_hash="old", created_at=datetime.utcnow() - timedelta(days=31)
    )
    recent = UsedTurnstileToken(token_hash="recent", created_at=datetime.utcnow())
    db.add_all([old, recent])
    db.commit()

    cleanup_old_turnstile_tokens(db)

    remaining = {row.token_hash for row in db.query(UsedTurnstileToken).all()}
    assert remaining == {"recent"}
