# Contact Form Email Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a prospect submits the contact form, send a styled HTML email to a dashboard-configurable list of recipients, via Resend, without touching the team's existing Zoho mailbox.

**Architecture:** A new `notification_recipients` table + protected CRUD router lets the dashboard manage the recipient list. A new `app/core/email.py` module builds the HTML and posts it to Resend's HTTP API via `httpx` (already a dependency). `POST /api/prospects/` dispatches the send as a FastAPI `BackgroundTask` after the prospect is saved, so a slow/failed send never affects the `201` response. The frontend gets a new "Notificaciones" tab on the existing Settings page.

**Tech Stack:** FastAPI, SQLAlchemy, `httpx` (already installed — no new backend dependency), pytest + `TestClient`, Next.js/React (existing `lib/api.ts` request helper).

**Spec:** `docs/superpowers/specs/2026-07-04-contact-form-email-notifications-design.md`

**Note on TDD scope:** Following this codebase's existing convention (see `app/models/prospect.py` / `app/schemas/prospect.py`, which have no dedicated unit tests — they're exercised indirectly through the router tests), Tasks 1–2 (plain SQLAlchemy model + Pydantic schemas, no logic) are implemented directly without a dedicated failing test. TDD starts at Task 3, where actual behavior (auth, validation, persistence) exists to test.

---

### Task 1: `NotificationRecipient` model

**Files:**
- Create: `backend/app/models/notification_recipient.py`

- [ ] **Step 1: Create the model**

```python
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from ..database import Base


class NotificationRecipient(Base):
    __tablename__ = "notification_recipients"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False, unique=True)
    created_at = Column(DateTime, server_default=func.now())
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/models/notification_recipient.py
git commit -m "feat: add NotificationRecipient model"
```

---

### Task 2: `NotificationRecipient` schemas

**Files:**
- Create: `backend/app/schemas/notification_recipient.py`

- [ ] **Step 1: Create the schemas**

```python
from pydantic import BaseModel, EmailStr
from datetime import datetime


class NotificationRecipientCreate(BaseModel):
    email: EmailStr


class NotificationRecipientResponse(BaseModel):
    id: int
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/notification_recipient.py
git commit -m "feat: add NotificationRecipient schemas"
```

---

### Task 3: Notifications router (CRUD, auth-protected)

**Files:**
- Modify: `backend/app/tests/conftest.py`
- Create: `backend/app/tests/test_notifications.py`
- Create: `backend/app/routers/notifications.py`

- [ ] **Step 1: Wire the notifications router and an authenticated test client into conftest**

Update `backend/app/tests/conftest.py` (the router doesn't exist yet — this will fail to import until Task 3 Step 4, which is expected and checked in Step 3 below):

```python
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from ..database import Base
from ..core.deps import get_db, get_current_user
from ..core.limiter import limiter
from ..models.user import User
from ..routers import prospects, notifications

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def _build_test_app() -> FastAPI:
    app = FastAPI()
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
    app.include_router(prospects.router, prefix="/api")
    app.include_router(notifications.router, prefix="/api")
    app.dependency_overrides[get_db] = _override_get_db
    return app


@pytest.fixture(autouse=True)
def _reset_schema_and_limiter():
    Base.metadata.create_all(bind=engine)
    limiter.reset()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(_build_test_app())


@pytest.fixture
def auth_client():
    app = _build_test_app()
    app.dependency_overrides[get_current_user] = lambda: User(
        id=1, email="admin@lyratech.com.mx", full_name="Admin", is_active=True
    )
    return TestClient(app)
```

- [ ] **Step 2: Write the failing tests**

Create `backend/app/tests/test_notifications.py`:

```python
def test_list_recipients_requires_auth(client):
    response = client.get("/api/notifications/recipients")
    assert response.status_code == 403


def test_create_recipient_requires_auth(client):
    response = client.post("/api/notifications/recipients", json={"email": "a@b.com"})
    assert response.status_code == 403


def test_delete_recipient_requires_auth(client):
    response = client.delete("/api/notifications/recipients/1")
    assert response.status_code == 403


def test_create_and_list_recipients(auth_client):
    create_res = auth_client.post(
        "/api/notifications/recipients", json={"email": "team@lyratech.com.mx"}
    )
    assert create_res.status_code == 201
    body = create_res.json()
    assert body["email"] == "team@lyratech.com.mx"
    assert "id" in body
    assert "created_at" in body

    list_res = auth_client.get("/api/notifications/recipients")
    assert list_res.status_code == 200
    emails = [r["email"] for r in list_res.json()]
    assert "team@lyratech.com.mx" in emails


def test_create_recipient_duplicate_rejected(auth_client):
    auth_client.post("/api/notifications/recipients", json={"email": "dup@lyratech.com.mx"})
    response = auth_client.post(
        "/api/notifications/recipients", json={"email": "dup@lyratech.com.mx"}
    )
    assert response.status_code == 409


def test_delete_recipient(auth_client):
    create_res = auth_client.post(
        "/api/notifications/recipients", json={"email": "gone@lyratech.com.mx"}
    )
    recipient_id = create_res.json()["id"]

    delete_res = auth_client.delete(f"/api/notifications/recipients/{recipient_id}")
    assert delete_res.status_code == 204

    list_res = auth_client.get("/api/notifications/recipients")
    assert all(r["id"] != recipient_id for r in list_res.json())


def test_delete_recipient_not_found(auth_client):
    response = auth_client.delete("/api/notifications/recipients/9999")
    assert response.status_code == 404
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && python -m pytest app/tests/test_notifications.py -v`
Expected: FAIL/ERROR — `ModuleNotFoundError: No module named 'app.routers.notifications'` (conftest imports it, and it doesn't exist yet).

- [ ] **Step 4: Implement the router**

Create `backend/app/routers/notifications.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..core.deps import get_db, get_current_user
from ..models.notification_recipient import NotificationRecipient
from ..models.user import User
from ..schemas.notification_recipient import (
    NotificationRecipientCreate,
    NotificationRecipientResponse,
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && python -m pytest app/tests/test_notifications.py app/tests/test_prospects.py -v`
Expected: all PASS (including the pre-existing prospects tests, confirming conftest changes didn't break them).

- [ ] **Step 6: Commit**

```bash
git add backend/app/tests/conftest.py backend/app/tests/test_notifications.py backend/app/routers/notifications.py
git commit -m "feat: add notifications recipients CRUD router"
```

---

### Task 4: Config settings for Resend

**Files:**
- Modify: `backend/app/config.py`

- [ ] **Step 1: Add the new settings fields**

In `backend/app/config.py`, add after the `TURNSTILE_SECRET_KEY` line:

```python
    RESEND_API_KEY: str = ""
    NOTIFICATION_FROM_EMAIL: str = "notificaciones@lyratech.com.mx"
    NOTIFICATION_FROM_NAME: str = "Lyratech"
    FRONTEND_URL: str = ""
```

The full class should now read:

```python
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: int = 3308
    DATABASE_NAME: str = "lyratech-dev"
    DATABASE_USER: str = "lyratech_user"
    DATABASE_PASSWORD: str = ""

    JWT_SECRET_KEY: str = "change-this-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    TURNSTILE_SECRET_KEY: str = ""

    RESEND_API_KEY: str = ""
    NOTIFICATION_FROM_EMAIL: str = "notificaciones@lyratech.com.mx"
    NOTIFICATION_FROM_NAME: str = "Lyratech"
    FRONTEND_URL: str = ""

    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3002",
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
```

- [ ] **Step 2: Verify the app still imports cleanly**

Run: `cd backend && python -c "from app.config import settings; print(settings.NOTIFICATION_FROM_EMAIL)"`
Expected: prints `notificaciones@lyratech.com.mx`

- [ ] **Step 3: Commit**

```bash
git add backend/app/config.py
git commit -m "feat: add Resend/notification settings"
```

---

### Task 5: Register router in `main.py` and add table to `init.sql`

**Files:**
- Modify: `backend/app/main.py`
- Modify: `backend/database/init.sql`

- [ ] **Step 1: Register the notifications router**

In `backend/app/main.py`, change the import line:

```python
from .routers import auth, leads, prospects, notifications
```

And add the include call after the existing ones:

```python
app.include_router(auth.router, prefix="/api")
app.include_router(leads.router, prefix="/api")
app.include_router(prospects.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
```

- [ ] **Step 2: Add the table to init.sql**

Append to `backend/database/init.sql`:

```sql

-- --------------------------------------------------------
-- Notification recipients (dashboard-configurable email list)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_recipients (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(255) NOT NULL UNIQUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- [ ] **Step 3: Run the full backend test suite**

Run: `cd backend && python -m pytest -v`
Expected: all PASS (this confirms the real app — `app.main` — still boots correctly with the new router registered; `Base.metadata.create_all` in `main.py` will also create `notification_recipients` automatically in dev/prod via SQLAlchemy metadata, independent of `init.sql`, which exists for fresh DB init parity with the other tables per existing convention).

- [ ] **Step 4: Commit**

```bash
git add backend/app/main.py backend/database/init.sql
git commit -m "feat: register notifications router and add table to init.sql"
```

---

### Task 6: Email building + sending via Resend

**Files:**
- Create: `backend/app/tests/test_email.py`
- Create: `backend/app/core/email.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/app/tests/test_email.py`:

```python
from app.core import email as email_module
from app.config import settings
from app.models.prospect import Prospect


def _make_prospect(**overrides):
    defaults = dict(
        id=1,
        name="Ada Lovelace",
        email="ada@example.com",
        phone="+52 555 000 0000",
        company="Acme",
        service="automatizaciones",
        message="Quiero saber más",
    )
    defaults.update(overrides)
    return Prospect(**defaults)


def test_build_html_includes_prospect_fields():
    html = email_module.build_prospect_notification_html(_make_prospect())
    assert "Ada Lovelace" in html
    assert "ada@example.com" in html
    assert "Acme" in html


def test_build_html_includes_dashboard_link_when_frontend_url_set(monkeypatch):
    monkeypatch.setattr(settings, "FRONTEND_URL", "https://lyratech.com.mx")
    html = email_module.build_prospect_notification_html(_make_prospect())
    assert "https://lyratech.com.mx/dashboard/prospects" in html


def test_build_html_omits_dashboard_link_when_frontend_url_empty(monkeypatch):
    monkeypatch.setattr(settings, "FRONTEND_URL", "")
    html = email_module.build_prospect_notification_html(_make_prospect())
    assert "dashboard/prospects" not in html


def test_send_skips_when_no_recipients(monkeypatch):
    calls = []
    monkeypatch.setattr(email_module.httpx, "post", lambda *a, **k: calls.append((a, k)))
    monkeypatch.setattr(settings, "RESEND_API_KEY", "test-key")
    email_module.send_prospect_notification_email(_make_prospect(), [])
    assert calls == []


def test_send_skips_when_api_key_missing(monkeypatch):
    calls = []
    monkeypatch.setattr(email_module.httpx, "post", lambda *a, **k: calls.append((a, k)))
    monkeypatch.setattr(settings, "RESEND_API_KEY", "")
    email_module.send_prospect_notification_email(_make_prospect(), ["team@lyratech.com.mx"])
    assert calls == []


def test_send_posts_to_resend_with_expected_payload(monkeypatch):
    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            pass

    def fake_post(url, json, headers, timeout):
        captured["url"] = url
        captured["json"] = json
        captured["headers"] = headers
        return FakeResponse()

    monkeypatch.setattr(email_module.httpx, "post", fake_post)
    monkeypatch.setattr(settings, "RESEND_API_KEY", "test-key")
    monkeypatch.setattr(settings, "NOTIFICATION_FROM_EMAIL", "notificaciones@lyratech.com.mx")
    monkeypatch.setattr(settings, "NOTIFICATION_FROM_NAME", "Lyratech")

    email_module.send_prospect_notification_email(
        _make_prospect(), ["team@lyratech.com.mx"]
    )

    assert captured["url"] == "https://api.resend.com/emails"
    assert captured["json"]["to"] == ["team@lyratech.com.mx"]
    assert captured["json"]["reply_to"] == "ada@example.com"
    assert captured["json"]["from"] == "Lyratech <notificaciones@lyratech.com.mx>"
    assert captured["json"]["subject"] == "Nuevo prospecto: Ada Lovelace"
    assert captured["headers"]["Authorization"] == "Bearer test-key"


def test_send_swallows_http_errors(monkeypatch):
    import httpx as httpx_module

    def fake_post(*a, **k):
        raise httpx_module.HTTPError("boom")

    monkeypatch.setattr(email_module.httpx, "post", fake_post)
    monkeypatch.setattr(settings, "RESEND_API_KEY", "test-key")

    email_module.send_prospect_notification_email(
        _make_prospect(), ["team@lyratech.com.mx"]
    )  # must not raise
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest app/tests/test_email.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.core.email'`

- [ ] **Step 3: Implement the email module**

Create `backend/app/core/email.py`:

```python
import logging
import httpx
from ..config import settings
from ..models.prospect import Prospect

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


def build_prospect_notification_html(prospect: Prospect) -> str:
    rows = [
        ("Nombre", prospect.name),
        ("Correo", prospect.email),
        ("Teléfono", prospect.phone or "—"),
        ("Empresa", prospect.company or "—"),
        ("Servicio", prospect.service or "—"),
        ("Mensaje", prospect.message or "—"),
    ]
    rows_html = "".join(
        f'<tr><td style="padding:8px 12px;font-weight:600;color:#2b2140;">{label}</td>'
        f'<td style="padding:8px 12px;color:#2b2140;">{value}</td></tr>'
        for label, value in rows
    )
    link_html = ""
    if settings.FRONTEND_URL:
        link_html = (
            f'<p style="margin-top:24px;">'
            f'<a href="{settings.FRONTEND_URL}/dashboard/prospects" '
            f'style="background:#6c4bf4;color:#fff;padding:10px 20px;border-radius:8px;'
            f'text-decoration:none;font-weight:600;">Ver en el dashboard</a></p>'
        )
    return (
        '<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">'
        '<h2 style="color:#2b2140;">Nuevo prospecto recibido</h2>'
        f'<table style="width:100%;border-collapse:collapse;">{rows_html}</table>'
        f"{link_html}"
        "</div>"
    )


def send_prospect_notification_email(
    prospect: Prospect, recipient_emails: list[str]
) -> None:
    if not recipient_emails:
        logger.info(
            "No notification recipients configured; skipping email for prospect %s",
            prospect.id,
        )
        return
    if not settings.RESEND_API_KEY:
        logger.warning(
            "RESEND_API_KEY not configured; skipping email for prospect %s", prospect.id
        )
        return

    payload = {
        "from": f"{settings.NOTIFICATION_FROM_NAME} <{settings.NOTIFICATION_FROM_EMAIL}>",
        "to": recipient_emails,
        "reply_to": prospect.email,
        "subject": f"Nuevo prospecto: {prospect.name}",
        "html": build_prospect_notification_html(prospect),
    }
    headers = {"Authorization": f"Bearer {settings.RESEND_API_KEY}"}

    try:
        response = httpx.post(RESEND_API_URL, json=payload, headers=headers, timeout=10.0)
        response.raise_for_status()
    except httpx.HTTPError:
        logger.exception(
            "Failed to send prospect notification email for prospect %s", prospect.id
        )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest app/tests/test_email.py -v`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/tests/test_email.py backend/app/core/email.py
git commit -m "feat: add Resend email building and sending"
```

---

### Task 7: Dispatch notification from prospect creation

**Files:**
- Modify: `backend/app/tests/test_prospects.py`
- Modify: `backend/app/routers/prospects.py`

- [ ] **Step 1: Write the failing test**

Append to `backend/app/tests/test_prospects.py`:

```python
def test_create_prospect_dispatches_notification_to_configured_recipients(
    client, auth_client, monkeypatch
):
    monkeypatch.setattr(
        "app.routers.prospects.verify_turnstile_token",
        lambda token, remote_ip=None: True,
    )
    auth_client.post(
        "/api/notifications/recipients", json={"email": "team@lyratech.com.mx"}
    )

    captured = {}

    def fake_send(prospect, recipient_emails):
        captured["prospect_name"] = prospect.name
        captured["recipient_emails"] = recipient_emails

    monkeypatch.setattr(
        "app.routers.prospects.send_prospect_notification_email", fake_send
    )

    response = client.post("/api/prospects/", json=VALID_PAYLOAD)
    assert response.status_code == 201
    assert captured["prospect_name"] == "Ada Lovelace"
    assert captured["recipient_emails"] == ["team@lyratech.com.mx"]


def test_create_prospect_dispatches_with_empty_list_when_no_recipients_configured(
    client, monkeypatch
):
    monkeypatch.setattr(
        "app.routers.prospects.verify_turnstile_token",
        lambda token, remote_ip=None: True,
    )

    captured = {}

    def fake_send(prospect, recipient_emails):
        captured["recipient_emails"] = recipient_emails

    monkeypatch.setattr(
        "app.routers.prospects.send_prospect_notification_email", fake_send
    )

    response = client.post("/api/prospects/", json=VALID_PAYLOAD)
    assert response.status_code == 201
    assert captured["recipient_emails"] == []
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest app/tests/test_prospects.py -v -k dispatches_notification`
Expected: FAIL — `AttributeError` / `AssertionError` (`captured` stays empty, since nothing calls `send_prospect_notification_email` yet).

- [ ] **Step 3: Wire the dispatch into `create_prospect`**

Update `backend/app/routers/prospects.py`:

```python
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest -v`
Expected: all PASS (full suite — confirms Tasks 1–7 all still work together).

- [ ] **Step 5: Commit**

```bash
git add backend/app/tests/test_prospects.py backend/app/routers/prospects.py
git commit -m "feat: dispatch prospect notification email as a background task"
```

---

### Task 8: Frontend API client additions

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Add the type and API methods**

Append to `frontend/src/lib/api.ts` (after the `prospectsApi`/`submitProspect` block):

```typescript
export interface NotificationRecipient {
  id: number;
  email: string;
  created_at: string;
}

export const notificationsApi = {
  list: () => request<NotificationRecipient[]>("/api/notifications/recipients"),
  create: (email: string) =>
    request<NotificationRecipient>("/api/notifications/recipients", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  remove: (id: number) =>
    request<void>(`/api/notifications/recipients/${id}`, { method: "DELETE" }),
};
```

- [ ] **Step 2: Verify the frontend still type-checks**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: add notificationsApi client"
```

---

### Task 9: Settings page — "Notificaciones" tab

**Files:**
- Modify: `frontend/src/app/dashboard/(protected)/settings/page.tsx`

- [ ] **Step 1: Update imports and the `Tab` type**

Change the icon import block:

```typescript
import {
  HiOutlineUser,
  HiOutlineLockClosed,
  HiOutlineMail,
  HiOutlineTrash,
  HiOutlineCheck,
  HiOutlineEye,
  HiOutlineEyeOff,
} from "react-icons/hi";
import { auth, getCachedUser, notificationsApi } from "@/lib/api";
import type { UserInfo, NotificationRecipient } from "@/lib/api";
```

Change the `Tab` type:

```typescript
type Tab = "cuenta" | "seguridad" | "notificaciones";
```

- [ ] **Step 2: Add recipients state and load/add/remove handlers**

Inside `SettingsPage`, after the password-related state block (after the `pwMsg` line), add:

```typescript
  // Notificaciones
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [newRecipientEmail, setNewRecipientEmail] = useState("");
  const [recipientSaving, setRecipientSaving] = useState(false);
  const [recipientMsg, setRecipientMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const loadRecipients = useCallback(async () => {
    setRecipientsLoading(true);
    try {
      const list = await notificationsApi.list();
      setRecipients(list);
    } catch {
      /* ignore — request() already redirects to login on 401 */
    } finally {
      setRecipientsLoading(false);
    }
  }, []);
```

Add a new `useEffect` after the existing one (the one calling `loadUser()`):

```typescript
  useEffect(() => {
    if (activeTab === "notificaciones") loadRecipients();
  }, [activeTab, loadRecipients]);
```

Add the handlers after `handlePasswordSave`:

```typescript
  async function handleAddRecipient(e: React.FormEvent) {
    e.preventDefault();
    setRecipientMsg(null);
    setRecipientSaving(true);
    try {
      const created = await notificationsApi.create(newRecipientEmail);
      setRecipients((prev) => [...prev, created]);
      setNewRecipientEmail("");
      setRecipientMsg({ type: "ok", text: "Correo agregado correctamente." });
    } catch (err: unknown) {
      setRecipientMsg({ type: "err", text: err instanceof Error ? err.message : "Error al agregar" });
    } finally {
      setRecipientSaving(false);
    }
  }

  async function handleRemoveRecipient(id: number) {
    setRecipientMsg(null);
    try {
      await notificationsApi.remove(id);
      setRecipients((prev) => prev.filter((r) => r.id !== id));
    } catch (err: unknown) {
      setRecipientMsg({ type: "err", text: err instanceof Error ? err.message : "Error al eliminar" });
    }
  }
```

- [ ] **Step 3: Add the tab to `TABS`**

```typescript
  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "cuenta", label: "Mi cuenta", icon: HiOutlineUser },
    { id: "seguridad", label: "Seguridad", icon: HiOutlineLockClosed },
    { id: "notificaciones", label: "Notificaciones", icon: HiOutlineMail },
  ];
```

- [ ] **Step 4: Add the tab content**

Add this block right after the closing `)}` of the "Seguridad" tab section (before the final closing `</div>` of the component):

```tsx
      {/* Tab: Notificaciones */}
      {activeTab === "notificaciones" && (
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-6">
          <h2 className="font-montserrat-bold text-dark-blue text-base mb-1">
            Correos de notificación
          </h2>
          <p className="font-montserrat text-dark-blue/40 text-sm mb-5">
            Estas direcciones reciben un aviso cada vez que llega un nuevo prospecto desde el formulario de contacto.
          </p>

          {recipientsLoading ? (
            <p className="font-montserrat text-dark-blue/40 text-sm">Cargando...</p>
          ) : recipients.length === 0 ? (
            <p className="font-montserrat text-dark-blue/40 text-sm mb-4">
              No hay correos configurados aún.
            </p>
          ) : (
            <ul className="space-y-2 mb-5">
              {recipients.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between border border-black/10 rounded-xl px-4 py-2.5"
                >
                  <span className="font-montserrat text-dark-blue text-sm">{r.email}</span>
                  <button
                    onClick={() => handleRemoveRecipient(r.id)}
                    className="p-1.5 rounded-lg hover:bg-red/10 text-red transition-colors"
                    title="Eliminar"
                  >
                    <HiOutlineTrash size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleAddRecipient} className="flex gap-2">
            <input
              type="email"
              required
              value={newRecipientEmail}
              onChange={(e) => setNewRecipientEmail(e.target.value)}
              className={inputClass}
              placeholder="nuevo@correo.com"
            />
            <button
              type="submit"
              disabled={recipientSaving}
              className="flex items-center gap-2 bg-lyratech-purple hover:bg-button-light-purple disabled:opacity-50 text-white font-montserrat font-semibold px-5 py-2.5 rounded-xl transition-all text-sm shadow-button hover:scale-[1.02] whitespace-nowrap"
            >
              <HiOutlineCheck size={16} />
              {recipientSaving ? "Agregando..." : "Agregar"}
            </button>
          </form>

          {recipientMsg && (
            <div className={`mt-4 rounded-lg px-4 py-2.5 text-sm font-montserrat border ${
              recipientMsg.type === "ok"
                ? "bg-lyratech-green/10 border-lyratech-green/30 text-lyratech-green"
                : "bg-red/10 border-red/30 text-red"
            }`}>
              {recipientMsg.text}
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 5: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification**

Run: `cd backend && python -m uvicorn app.main:app --reload` (one terminal) and `cd frontend && npm run dev` (another terminal). Log into the dashboard, go to **Configuración → Notificaciones**, add an email, confirm it appears in the list and persists after a page refresh, then remove it and confirm it disappears.

- [ ] **Step 7: Commit**

```bash
git add "frontend/src/app/dashboard/(protected)/settings/page.tsx"
git commit -m "feat: add Notificaciones tab to Settings page"
```

---

### Task 10: External setup and end-to-end verification

This task is manual — no code changes. It configures the real Resend account and confirms the whole flow works with a live send.

- [ ] **Step 1: Create the Resend account and verify the sending subdomain**

At resend.com, sign up (free tier), then add domain `notificaciones.lyratech.com.mx` under Domains. Resend will show SPF (TXT) and DKIM (CNAME/TXT) records — add exactly those to the DNS provider for `lyratech.com.mx`, scoped to the `notificaciones` subdomain only. Wait for Resend to show the domain as "Verified" (can take a few minutes to a few hours for DNS propagation).

- [ ] **Step 2: Generate an API key**

In the Resend dashboard, create an API key and copy it.

- [ ] **Step 3: Add the env vars to `backend/.env`**

Add these lines (this file is gitignored — do not commit it):

```
RESEND_API_KEY=<the key from Step 2>
NOTIFICATION_FROM_EMAIL=notificaciones@lyratech.com.mx
NOTIFICATION_FROM_NAME=Lyratech
FRONTEND_URL=https://lyratech.com.mx
```

Restart the backend so it picks up the new `.env` values.

- [ ] **Step 4: Add at least one real recipient**

In the dashboard, go to Configuración → Notificaciones and add a real email address you can check.

- [ ] **Step 5: Submit the real contact form**

Go to the public `/contact` page, fill it out, and submit. Confirm:
- The form shows its existing success state.
- A new row appears in Dashboard → Prospectos.
- The configured recipient(s) receive the styled email within a few seconds, with subject `Nuevo prospecto: <name>`.
- Clicking "Responder" on that email addresses the reply to the prospect's email, not to `notificaciones@lyratech.com.mx`.

- [ ] **Step 6: Confirm Zoho is unaffected**

Send/receive a test email through the existing Zoho mailbox as normal — confirm nothing changed there (this is expected, since no Zoho DNS records or mailbox settings were touched, but worth a quick sanity check post-launch).
