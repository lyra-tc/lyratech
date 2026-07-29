from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class ProspectCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    service: Optional[str] = None
    message: Optional[str] = None
    turnstile_token: str


class ProspectResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    service: Optional[str] = None
    message: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
