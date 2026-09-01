from sqlalchemy import Column, DateTime, String
from sqlalchemy.sql import func

from ..database import Base


class UsedTurnstileToken(Base):
    __tablename__ = "used_turnstile_tokens"

    token_hash = Column(String(64), primary_key=True)
    created_at = Column(DateTime, server_default=func.now())
