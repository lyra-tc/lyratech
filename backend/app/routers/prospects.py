from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..core.deps import get_db, get_current_admin
from ..models.prospect import Prospect, ProspectStatus
from ..models.user import User
from ..schemas.prospect import (
    ProspectCreate,
    ProspectPage,
    ProspectStats,
    ProspectUpdate,
    ProspectResponse,
)

router = APIRouter(prefix="/prospects", tags=["prospects"])


@router.get("/", response_model=ProspectPage)
def list_prospects(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: str = Query(""),
    status: str = Query(""),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    query = db.query(Prospect)
    if search:
        like = f"%{search}%"
        query = query.filter(
            Prospect.name.ilike(like)
            | Prospect.email.ilike(like)
            | Prospect.company.ilike(like)
        )
    valid = {s.value for s in ProspectStatus}
    if status in valid:
        query = query.filter(Prospect.status == status)
    total = query.count()
    items = (
        query.order_by(Prospect.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {"items": items, "total": total}


@router.get("/stats", response_model=ProspectStats)
def prospect_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    counts = dict(
        db.query(Prospect.status, func.count(Prospect.id)).group_by(Prospect.status).all()
    )
    by_status = {s.value: int(counts.get(s, 0)) for s in ProspectStatus}
    return {"total": sum(by_status.values()), **by_status}


@router.post("/", response_model=ProspectResponse, status_code=201)
def create_prospect(
    body: ProspectCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    if body.status == ProspectStatus.meeting_scheduled:
        raise HTTPException(
            status_code=422,
            detail="No se puede crear un prospecto directamente en Reunión agendada",
        )
    prospect = Prospect(**body.model_dump())
    db.add(prospect)
    db.commit()
    db.refresh(prospect)
    return prospect


@router.get("/{prospect_id}", response_model=ProspectResponse)
def get_prospect(
    prospect_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    prospect = db.query(Prospect).filter(Prospect.id == prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospecto no encontrado")
    return prospect


@router.put("/{prospect_id}", response_model=ProspectResponse)
def update_prospect(
    prospect_id: int,
    body: ProspectUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    prospect = db.query(Prospect).filter(Prospect.id == prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospecto no encontrado")

    data = body.model_dump(exclude_unset=True)
    new_status = data.get("status")
    if (
        prospect.status == ProspectStatus.meeting_scheduled
        and new_status in (ProspectStatus.meeting_to_schedule, ProspectStatus.call_later)
    ):
        raise HTTPException(
            status_code=409,
            detail="Un prospecto en Reunión agendada solo puede pasar a Perdido",
        )
    if (
        new_status == ProspectStatus.meeting_scheduled
        and prospect.status
        not in (ProspectStatus.meeting_to_schedule, ProspectStatus.meeting_scheduled)
    ):
        raise HTTPException(
            status_code=409,
            detail="Reunión agendada solo se puede asignar desde Agendar reunión",
        )

    for field, value in data.items():
        setattr(prospect, field, value)

    db.commit()
    db.refresh(prospect)
    return prospect


@router.delete("/{prospect_id}", status_code=204)
def delete_prospect(
    prospect_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    prospect = db.query(Prospect).filter(Prospect.id == prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospecto no encontrado")
    db.delete(prospect)
    db.commit()
