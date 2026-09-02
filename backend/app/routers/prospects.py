from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..core.deps import get_db, get_current_admin
from ..models.prospect import Prospect
from ..models.user import User
from ..schemas.prospect import ProspectCreate, ProspectUpdate, ProspectResponse

router = APIRouter(prefix="/prospects", tags=["prospects"])


@router.get("/", response_model=List[ProspectResponse])
def list_prospects(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    return (
        db.query(Prospect)
        .order_by(Prospect.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/", response_model=ProspectResponse, status_code=201)
def create_prospect(
    body: ProspectCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
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

    for field, value in body.model_dump(exclude_unset=True).items():
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
