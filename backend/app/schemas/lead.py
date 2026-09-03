from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional


def _blank_to_none(v):
    if isinstance(v, str) and not v.strip():
        return None
    return v


class LeadCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    service: Optional[str] = None
    message: Optional[str] = None
    turnstile_token: str


class LeadManualCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    service: Optional[str] = None
    message: Optional[str] = None
    industry: Optional[str] = None
    address: Optional[str] = None

    _email_blank = field_validator("email", mode="before")(_blank_to_none)


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    service: Optional[str] = None
    message: Optional[str] = None
    industry: Optional[str] = None
    address: Optional[str] = None

    _email_blank = field_validator("email", mode="before")(_blank_to_none)


class LeadResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    service: Optional[str] = None
    message: Optional[str] = None
    industry: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
