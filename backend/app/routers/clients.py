from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..core.deps import get_db, get_current_admin
from ..models.client import Client, ClientPayment, ClientStatus
from ..models.prospect import Prospect
from ..models.user import User
from ..schemas.client import (
    ClientFromProspect,
    ClientPage,
    ClientResponse,
    ClientStats,
    ClientUpdate,
    _check_commission,
)

router = APIRouter(prefix="/clients", tags=["clients"])

_COPIED = ("name", "email", "phone", "company", "industry", "service", "source", "notes")


def _apply_filters(query, search: str, status: str):
    if search:
        like = f"%{search}%"
        query = query.filter(
            Client.name.ilike(like)
            | Client.email.ilike(like)
            | Client.company.ilike(like)
            | Client.responsable.ilike(like)
        )
    if status in {s.value for s in ClientStatus}:
        query = query.filter(Client.status == status)
    return query


@router.get("/", response_model=ClientPage)
def list_clients(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: str = Query(""),
    status: str = Query(""),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    total = _apply_filters(db.query(func.count(Client.id)), search, status).scalar()

    paid_subq = (
        select(func.coalesce(func.sum(ClientPayment.amount), 0))
        .where(ClientPayment.client_id == Client.id, ClientPayment.is_paid.is_(True))
        .correlate(Client)
        .scalar_subquery()
    )
    rows = (
        _apply_filters(db.query(Client, paid_subq.label("paid_total")), search, status)
        .order_by(Client.created_at.desc(), Client.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = [
        {
            "id": c.id,
            "name": c.name,
            "company": c.company,
            "industry": c.industry,
            "responsable": c.responsable,
            "status": c.status,
            "project_amount": c.project_amount,
            "project_start_date": c.project_start_date,
            "paid_total": Decimal(str(paid_total)),
            "created_at": c.created_at,
        }
        for c, paid_total in rows
    ]
    return {"items": items, "total": total}


@router.get("/stats", response_model=ClientStats)
def client_stats(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    counts = dict(
        db.query(Client.status, func.count(Client.id)).group_by(Client.status).all()
    )
    by_status = {s.value: int(counts.get(s, 0)) for s in ClientStatus}
    contratado = db.query(func.coalesce(func.sum(Client.project_amount), 0)).scalar()
    cobrado = (
        db.query(func.coalesce(func.sum(ClientPayment.amount), 0))
        .filter(ClientPayment.is_paid.is_(True))
        .scalar()
    )
    return {
        "total": sum(by_status.values()),
        "by_status": by_status,
        "contratado_total": Decimal(str(contratado)),
        "cobrado_total": Decimal(str(cobrado)),
    }


@router.post("/from-prospect/{prospect_id}", response_model=ClientResponse, status_code=201)
def create_client_from_prospect(
    prospect_id: int,
    body: ClientFromProspect,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    prospect = db.query(Prospect).filter(Prospect.id == prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospecto no encontrado")

    if not body.responsable.strip():
        raise HTTPException(status_code=422, detail="El responsable es obligatorio")

    client = Client(
        **{f: getattr(prospect, f) for f in _COPIED},
        responsable=body.responsable.strip(),
        comisionista=(body.comisionista or "").strip() or None,
        comision_tipo=body.comision_tipo,
        comision_valor=body.comision_valor,
        status=ClientStatus.nuevo,
        converted_from_prospect_id=prospect.id,
    )
    db.add(client)
    db.delete(prospect)
    db.commit()
    db.refresh(client)
    return client


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return client


@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: int,
    body: ClientUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    data = body.model_dump(exclude_unset=True)
    if "responsable" in data and not (data["responsable"] or "").strip():
        raise HTTPException(status_code=422, detail="El responsable es obligatorio")

    payments = data.pop("payments", None)
    for field, value in data.items():
        setattr(client, field, value)

    try:
        _check_commission(client.comision_tipo, client.comision_valor)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    if payments is not None:
        client.payments.clear()
        db.flush()
        for row in payments:
            client.payments.append(ClientPayment(**row))

    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=204)
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    db.delete(client)
    db.commit()
