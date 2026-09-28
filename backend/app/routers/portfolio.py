import json
import logging
import uuid as uuid_lib
from typing import Callable, Iterable, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from pydantic import ValidationError
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..core.deps import get_current_admin, get_db
from ..core.portfolio_files import (
    LOGO_MAX_BYTES,
    VIDEO_MAX_BYTES,
    DetectedFile,
    InvalidFileError,
    detect_logo,
    detect_video,
    read_limited,
)
from ..core.storage import (
    Storage,
    StorageError,
    get_storage,
    object_key,
    project_prefix,
    public_url,
)
from ..models.portfolio_project import PortfolioLinkType, PortfolioProject
from ..models.user import User
from ..schemas.portfolio import (
    LOCALES,
    PortfolioAdmin,
    PortfolioDescriptions,
    PortfolioFields,
    PortfolioMove,
    PortfolioPublic,
    PortfolioPublish,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

_FIELD_NAMES = tuple(PortfolioFields.model_fields)
_STORAGE_UNAVAILABLE = "No se pudo guardar el archivo, intenta de nuevo"

# (object key, bytes, detected type) waiting to be uploaded.
PendingUpload = tuple[str, bytes, DetectedFile]


# --- serialización -----------------------------------------------------------

def _public_fields(project: PortfolioProject) -> dict:
    return {
        "uuid": project.uuid,
        "name": project.name,
        "descriptions": PortfolioDescriptions(
            **{locale: getattr(project, f"description_{locale}") for locale in LOCALES}
        ),
        "technologies": project.technologies or [],
        "categories": project.categories or [],
        "link_type": project.link_type,
        "website_url": project.website_url,
        "play_store_url": project.play_store_url,
        "app_store_url": project.app_store_url,
        "logo_url": public_url(project.logo_key),
        "video_url": public_url(project.video_key) if project.video_key else None,
    }


def _to_public(project: PortfolioProject) -> PortfolioPublic:
    return PortfolioPublic(**_public_fields(project))


def _to_admin(project: PortfolioProject) -> PortfolioAdmin:
    return PortfolioAdmin(
        **_public_fields(project),
        id=project.id,
        sort_order=project.sort_order,
        is_published=project.is_published,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


# --- entrada multipart -------------------------------------------------------

async def _form_fields(request: Request) -> dict:
    """The form fields that were actually sent (an empty string counts as sent,
    so PATCH can clear a URL). Lists travel as JSON strings.

    Read from the raw form rather than individual `Form(...)` params: FastAPI/
    Starlette otherwise has no way to tell "field sent as empty string" apart
    from "field not sent at all", which would make clearing an optional field
    via PATCH silently no-op (the merge in `update_project` would just keep
    the stored value). Starlette caches the parsed form, so the `logo`/`video`
    `File(...)` params below still see the same multipart body.
    """
    form = await request.form()
    fields = {name: form[name] for name in _FIELD_NAMES if isinstance(form.get(name), str)}
    for key in ("technologies", "categories"):
        if key not in fields:
            continue
        try:
            value = json.loads(fields[key])
        except json.JSONDecodeError:
            raise HTTPException(status_code=422, detail=f"El campo {key} debe ser una lista JSON")
        if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
            raise HTTPException(status_code=422, detail=f"El campo {key} debe ser una lista de textos")
        fields[key] = value
    return fields


def _validate_fields(data: dict) -> PortfolioFields:
    try:
        return PortfolioFields(**data)
    except ValidationError as exc:
        messages = []
        for error in exc.errors():
            if error["type"] == "missing":
                messages.append(f"Falta el campo {error['loc'][0]}")
            elif error["loc"] == ("link_type",):
                messages.append("Tipo de enlace inválido")
            else:
                messages.append(error["msg"].removeprefix("Value error, "))
        raise HTTPException(status_code=422, detail="; ".join(messages))


def _read_upload(
    upload: UploadFile, max_bytes: int, detect: Callable[[bytes], DetectedFile]
) -> tuple[bytes, DetectedFile]:
    try:
        data = read_limited(upload.file, max_bytes)
        return data, detect(data)
    except InvalidFileError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


# --- storage / consistencia --------------------------------------------------

def _safe_delete(storage: Storage, keys: Iterable[str]) -> None:
    for key in keys:
        try:
            storage.delete(key)
        except StorageError:
            logger.exception("No se pudo borrar %s de MinIO", key)


def _upload_all(storage: Storage, pending: List[PendingUpload]) -> None:
    """Upload every pending object or none: on failure, already-uploaded ones are removed."""
    done: List[str] = []
    try:
        for key, data, detected in pending:
            storage.upload(key, data, detected.content_type)
            done.append(key)
    except StorageError:
        logger.exception("Falló la subida a MinIO")
        _safe_delete(storage, done)
        raise HTTPException(status_code=503, detail=_STORAGE_UNAVAILABLE)


def _commit_or_cleanup(db: Session, storage: Storage, uploaded: List[PendingUpload]) -> None:
    """Commit; if the DB fails, remove the objects we just uploaded so MinIO has no orphans."""
    try:
        db.commit()
    except Exception:
        db.rollback()
        _safe_delete(storage, [key for key, _, _ in uploaded])
        raise


def _get_or_404(db: Session, project_id: int) -> PortfolioProject:
    project = db.get(PortfolioProject, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return project


def _ordered(db: Session) -> List[PortfolioProject]:
    return (
        db.query(PortfolioProject)
        .order_by(PortfolioProject.sort_order, PortfolioProject.id)
        .all()
    )


def _prefix_of(project: PortfolioProject) -> str:
    """The project's MinIO folder, derived from its (always present) logo key."""
    return project.logo_key.rsplit("/", 1)[0] + "/"


# --- endpoints ---------------------------------------------------------------

@router.get("", response_model=List[PortfolioPublic])
def list_published(db: Session = Depends(get_db)):
    projects = (
        db.query(PortfolioProject)
        .filter(PortfolioProject.is_published.is_(True))
        .order_by(PortfolioProject.sort_order, PortfolioProject.id)
        .all()
    )
    return [_to_public(project) for project in projects]


@router.get("/admin", response_model=List[PortfolioAdmin])
def list_all(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return [_to_admin(project) for project in _ordered(db)]


@router.post("", response_model=PortfolioAdmin, status_code=201)
def create_project(
    # Admin check first so an unauthenticated caller gets 401 instead of a
    # validation error. This does NOT bound how much of the body gets read
    # before that check runs: FastAPI/Starlette spools the whole multipart
    # body while parsing form fields before any dependency executes, so body
    # size is actually bounded by Nginx's client_max_body_size, not by this
    # parameter ordering.
    _: User = Depends(get_current_admin),
    fields: dict = Depends(_form_fields),
    logo: UploadFile = File(...),
    video: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    storage: Storage = Depends(get_storage),
):
    data = _validate_fields(fields)
    project_uuid = str(uuid_lib.uuid4())
    prefix = project_prefix(data.name, project_uuid)

    logo_bytes, logo_type = _read_upload(logo, LOGO_MAX_BYTES, detect_logo)
    pending: List[PendingUpload] = [(object_key(prefix, "logo", logo_type.ext), logo_bytes, logo_type)]
    video_key = None
    if data.link_type == PortfolioLinkType.video:
        if video is None:
            raise HTTPException(status_code=422, detail="El video es requerido")
        video_bytes, video_type = _read_upload(video, VIDEO_MAX_BYTES, detect_video)
        video_key = object_key(prefix, "video", video_type.ext)
        pending.append((video_key, video_bytes, video_type))

    max_order = db.query(func.max(PortfolioProject.sort_order)).scalar()
    _upload_all(storage, pending)

    project = PortfolioProject(
        uuid=project_uuid,
        **data.model_dump(),
        logo_key=pending[0][0],
        video_key=video_key,
        sort_order=0 if max_order is None else max_order + 1,
        is_published=True,
    )
    db.add(project)
    _commit_or_cleanup(db, storage, pending)
    db.refresh(project)
    return _to_admin(project)


@router.patch("/{project_id}", response_model=PortfolioAdmin)
def update_project(
    project_id: int,
    _: User = Depends(get_current_admin),
    fields: dict = Depends(_form_fields),
    logo: Optional[UploadFile] = File(None),
    video: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    storage: Storage = Depends(get_storage),
):
    project = _get_or_404(db, project_id)
    current = {name: getattr(project, name) for name in _FIELD_NAMES}
    data = _validate_fields({**current, **fields})
    prefix = _prefix_of(project)

    pending: List[PendingUpload] = []
    new_logo_key = new_video_key = None
    if logo is not None:
        logo_bytes, logo_type = _read_upload(logo, LOGO_MAX_BYTES, detect_logo)
        new_logo_key = object_key(prefix, "logo", logo_type.ext)
        pending.append((new_logo_key, logo_bytes, logo_type))
    if data.link_type == PortfolioLinkType.video:
        if video is not None:
            video_bytes, video_type = _read_upload(video, VIDEO_MAX_BYTES, detect_video)
            new_video_key = object_key(prefix, "video", video_type.ext)
            pending.append((new_video_key, video_bytes, video_type))
        elif project.video_key is None:
            raise HTTPException(status_code=422, detail="El video es requerido")

    _upload_all(storage, pending)

    obsolete: List[str] = []
    for key, value in data.model_dump().items():
        setattr(project, key, value)
    if new_logo_key:
        obsolete.append(project.logo_key)
        project.logo_key = new_logo_key
    if new_video_key:
        if project.video_key:
            obsolete.append(project.video_key)
        project.video_key = new_video_key
    elif data.link_type != PortfolioLinkType.video and project.video_key:
        obsolete.append(project.video_key)
        project.video_key = None

    _commit_or_cleanup(db, storage, pending)
    # Old files go only after the commit, so a failed save never loses the current ones.
    _safe_delete(storage, obsolete)
    db.refresh(project)
    return _to_admin(project)


@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
    storage: Storage = Depends(get_storage),
):
    project = _get_or_404(db, project_id)
    prefix = _prefix_of(project)
    db.delete(project)
    db.commit()
    try:
        storage.delete_prefix(prefix)
    except StorageError:
        # The row is gone, so the site is already correct; the folder is just orphaned.
        logger.exception("No se pudo borrar la carpeta %s de MinIO", prefix)
    return Response(status_code=204)


@router.post("/{project_id}/move", response_model=List[PortfolioAdmin])
def move_project(
    project_id: int,
    body: PortfolioMove,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    project = _get_or_404(db, project_id)
    ordered = _ordered(db)
    index = ordered.index(project)
    target = index - 1 if body.direction == "up" else index + 1
    if 0 <= target < len(ordered):
        ordered[index], ordered[target] = ordered[target], ordered[index]
    # Renumber densely so gaps or ties can never turn a swap into a no-op.
    for position, item in enumerate(ordered):
        item.sort_order = position
    db.commit()
    return [_to_admin(item) for item in ordered]


@router.patch("/{project_id}/publish", response_model=PortfolioAdmin)
def set_published(
    project_id: int,
    body: PortfolioPublish,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    project = _get_or_404(db, project_id)
    project.is_published = body.is_published
    db.commit()
    db.refresh(project)
    return _to_admin(project)
