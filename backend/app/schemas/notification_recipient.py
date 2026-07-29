from pydantic import BaseModel, EmailStr
from datetime import datetime


class NotificationRecipientCreate(BaseModel):
    email: EmailStr


class NotificationRecipientResponse(BaseModel):
    id: int
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationTestResponse(BaseModel):
    message: str
