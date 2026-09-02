from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from ..core.deps import get_db, get_current_admin
from ..core.idempotency import claim_turnstile_token
from ..core.limiter import limiter
from ..core.turnstile import verify_turnstile_token
from ..core.email import send_lead_notification_email
from ..models.lead import Lead
from ..models.notification_recipient import NotificationRecipient
from ..models.user import User
from ..schemas.lead import LeadCreate, LeadResponse

router = APIRouter(prefix="/leads", tags=["leads"])


@router.post("/", response_model=LeadResponse, status_code=201)
@limiter.limit("5/hour")
def create_lead(
    request: Request,
    body: LeadCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    remote_ip = request.client.host if request.client else None
    if not verify_turnstile_token(body.turnstile_token, remote_ip):
        raise HTTPException(
            status_code=400,
            detail="No se pudo verificar que eres humano, intenta de nuevo",
        )

    if not claim_turnstile_token(db, body.turnstile_token):
        raise HTTPException(status_code=409, detail="Esta solicitud ya fue procesada")

    lead = Lead(**body.model_dump(exclude={"turnstile_token"}))
    db.add(lead)
    db.commit()
    db.refresh(lead)

    recipient_emails = [r.email for r in db.query(NotificationRecipient).all()]
    background_tasks.add_task(send_lead_notification_email, lead, recipient_emails)

    return lead


@router.get("/", response_model=List[LeadResponse])
def list_leads(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    return (
        db.query(Lead)
        .order_by(Lead.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.delete("/{lead_id}", status_code=204)
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    db.delete(lead)
    db.commit()
