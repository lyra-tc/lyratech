from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import httpx
from ..core.deps import get_db, get_current_user
from ..core.email import send_test_notification_email
from ..models.notification_recipient import NotificationRecipient
from ..models.user import User
from ..schemas.notification_recipient import (
    NotificationRecipientCreate,
    NotificationRecipientResponse,
    NotificationTestResponse,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/recipients", response_model=List[NotificationRecipientResponse])
def list_recipients(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return (
        db.query(NotificationRecipient)
        .order_by(NotificationRecipient.created_at)
        .all()
    )


@router.post("/recipients", response_model=NotificationRecipientResponse, status_code=201)
def create_recipient(
    body: NotificationRecipientCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    existing = (
        db.query(NotificationRecipient)
        .filter(NotificationRecipient.email == body.email)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Este correo ya está en la lista")

    recipient = NotificationRecipient(email=body.email)
    db.add(recipient)
    db.commit()
    db.refresh(recipient)
    return recipient


@router.delete("/recipients/{recipient_id}", status_code=204)
def delete_recipient(
    recipient_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    recipient = (
        db.query(NotificationRecipient)
        .filter(NotificationRecipient.id == recipient_id)
        .first()
    )
    if not recipient:
        raise HTTPException(status_code=404, detail="Correo no encontrado")
    db.delete(recipient)
    db.commit()


@router.post(
    "/recipients/{recipient_id}/test",
    response_model=NotificationTestResponse,
)
def send_test_recipient_email(
    recipient_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    recipient = (
        db.query(NotificationRecipient)
        .filter(NotificationRecipient.id == recipient_id)
        .first()
    )
    if not recipient:
        raise HTTPException(status_code=404, detail="Correo no encontrado")

    try:
        send_test_notification_email(recipient.email)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail="No se pudo enviar el correo de prueba",
        ) from exc

    return {"message": "Correo de prueba enviado correctamente."}
