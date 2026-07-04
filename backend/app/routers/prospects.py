from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from ..core.deps import get_db, get_current_user
from ..core.limiter import limiter
from ..core.turnstile import verify_turnstile_token
from ..core.email import send_prospect_notification_email
from ..models.prospect import Prospect
from ..models.notification_recipient import NotificationRecipient
from ..models.user import User
from ..schemas.prospect import ProspectCreate, ProspectResponse

router = APIRouter(prefix="/prospects", tags=["prospects"])


@router.post("/", response_model=ProspectResponse, status_code=201)
@limiter.limit("5/hour")
def create_prospect(
    request: Request,
    body: ProspectCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    remote_ip = request.client.host if request.client else None
    if not verify_turnstile_token(body.turnstile_token, remote_ip):
        raise HTTPException(
            status_code=400,
            detail="No se pudo verificar que eres humano, intenta de nuevo",
        )

    prospect = Prospect(**body.model_dump(exclude={"turnstile_token"}))
    db.add(prospect)
    db.commit()
    db.refresh(prospect)

    recipient_emails = [r.email for r in db.query(NotificationRecipient).all()]
    background_tasks.add_task(send_prospect_notification_email, prospect, recipient_emails)

    return prospect


@router.get("/", response_model=List[ProspectResponse])
def list_prospects(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return (
        db.query(Prospect)
        .order_by(Prospect.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.delete("/{prospect_id}", status_code=204)
def delete_prospect(
    prospect_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    prospect = db.query(Prospect).filter(Prospect.id == prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospecto no encontrado")
    db.delete(prospect)
    db.commit()
