import base64

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Request,
    Response,
    UploadFile,
)
from sqlalchemy.orm import Session
from typing import List
from ..core.deps import get_db, get_current_admin
from ..core.idempotency import claim_turnstile_token
from ..core.limiter import limiter
from ..core.turnstile import verify_turnstile_token
from ..core.email import send_lead_notification_email
from ..core.lead_import import (
    LEAD_FIELDS,
    TEMPLATE_HEADERS,
    LeadImportError,
    build_xlsx,
    parse_upload,
    plan_import,
)
from ..models.lead import Lead
from ..models.notification_recipient import NotificationRecipient
from ..models.user import User
from ..schemas.lead import (
    LeadCreate,
    LeadImportResult,
    LeadImportSkip,
    LeadManualCreate,
    LeadResponse,
    LeadUpdate,
)

router = APIRouter(prefix="/leads", tags=["leads"])

_IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024
_IMPORT_MAX_ROWS = 2000
_XLSX_MEDIA = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


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


@router.post("/manual", response_model=LeadResponse, status_code=201)
def create_lead_manual(
    body: LeadManualCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    lead = Lead(**body.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)

    recipient_emails = [r.email for r in db.query(NotificationRecipient).all()]
    background_tasks.add_task(send_lead_notification_email, lead, recipient_emails)

    return lead


@router.get("/import/template")
def download_import_template(_: User = Depends(get_current_admin)):
    return Response(
        content=build_xlsx(TEMPLATE_HEADERS, []),
        media_type=_XLSX_MEDIA,
        headers={"Content-Disposition": 'attachment; filename="plantilla-leads.xlsx"'},
    )


@router.post("/import", response_model=LeadImportResult)
async def import_leads(
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    all_rows: list[dict] = []
    for f in files:
        content = await f.read()
        if len(content) > _IMPORT_MAX_FILE_BYTES:
            raise HTTPException(400, f"«{f.filename}» supera el límite de 5 MB.")
        try:
            all_rows.extend(parse_upload(f.filename or "", content))
        except LeadImportError as exc:
            raise HTTPException(400, str(exc))

    if not all_rows:
        raise HTTPException(400, "No se encontraron filas para importar.")
    if len(all_rows) > _IMPORT_MAX_ROWS:
        raise HTTPException(
            400, f"Demasiadas filas ({len(all_rows)}). El máximo es {_IMPORT_MAX_ROWS}."
        )

    existing_emails = {
        e.lower()
        for (e,) in db.query(Lead.email).filter(Lead.email.isnot(None)).all()
        if e and e.strip()
    }
    existing_phones = {
        p.strip()
        for (p,) in db.query(Lead.phone).filter(Lead.phone.isnot(None)).all()
        if p and p.strip()
    }

    to_insert, skipped = plan_import(all_rows, existing_emails, existing_phones)

    if to_insert:
        db.add_all(
            [Lead(**{k: (row.get(k) or None) for k in LEAD_FIELDS}) for row in to_insert]
        )
        db.commit()

    report_b64 = None
    if skipped:
        report_rows = [
            [row.get(k, "") for k in LEAD_FIELDS] + [reason] for row, reason in skipped
        ]
        report_b64 = base64.b64encode(
            build_xlsx(TEMPLATE_HEADERS + ["Motivo"], report_rows)
        ).decode()

    return LeadImportResult(
        inserted=len(to_insert),
        skipped_count=len(skipped),
        skipped=[
            LeadImportSkip(file=row.get("_file", ""), row=row.get("_row", 0), reason=reason)
            for row, reason in skipped
        ],
        report_xlsx_base64=report_b64,
    )


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


@router.put("/{lead_id}", response_model=LeadResponse)
def update_lead(
    lead_id: int,
    body: LeadUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")

    data = body.model_dump(exclude_unset=True)
    if "name" in data and not (data["name"] or "").strip():
        raise HTTPException(status_code=422, detail="El nombre no puede quedar vacío")

    for field, value in data.items():
        setattr(lead, field, value)

    db.commit()
    db.refresh(lead)
    return lead


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
