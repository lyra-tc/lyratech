from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from ..models.prospect import ProspectStatus


class ProspectCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    service: Optional[str] = None
    status: ProspectStatus = ProspectStatus.new
    source: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[int] = None


class ProspectUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    service: Optional[str] = None
    status: Optional[ProspectStatus] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[int] = None


class ProspectResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    service: Optional[str] = None
    status: ProspectStatus
    source: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
