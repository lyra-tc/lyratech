import enum
from sqlalchemy import Column, Integer, String, Text, Enum, DateTime, ForeignKey
from sqlalchemy.sql import func
from ..database import Base


class ProspectStatus(str, enum.Enum):
    meeting_to_schedule = "meeting_to_schedule"
    call_later = "call_later"
    lost = "lost"


class Prospect(Base):
    __tablename__ = "prospects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(50))
    company = Column(String(255))
    service = Column(String(100))
    status = Column(Enum(ProspectStatus), nullable=False, default=ProspectStatus.meeting_to_schedule)
    source = Column(String(100))
    notes = Column(Text)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
