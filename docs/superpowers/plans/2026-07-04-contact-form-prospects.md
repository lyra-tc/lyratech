# Contact Form → Prospects Table → Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the public contact form to persist submissions into the existing `prospects` DB table via a public, spam-protected endpoint, and add a dashboard section to review and promote those submissions into `leads`.

**Architecture:** FastAPI gets a new `prospects` router — one public rate-limited+Turnstile-verified `POST`, and two JWT-protected `GET`/`DELETE` routes reusing the existing auth dependency. Next.js gets a Cloudflare Turnstile widget wired into `ContactForm`, and a new `/dashboard/prospects` page that reuses a newly-extracted `LeadFormModal` (pulled out of the existing leads page) to support "convert to lead".

**Tech Stack:** FastAPI, SQLAlchemy, `slowapi` (rate limiting), Cloudflare Turnstile (bot verification), pytest (new to this repo — backend has zero existing test infra), Next.js/React, next-intl.

**Reference spec:** `docs/superpowers/specs/2026-07-04-contact-form-prospects-design.md`

---

## Important context for whoever implements this

- The `prospects` table **already exists** on the dev DB server (created manually, outside `init.sql`): `id, name, email, phone, company, service, message, created_at`. This plan adds the matching `init.sql` DDL, but do not need to create the table on the live dev server — it's already there.
- The backend has **no existing test suite** (no pytest, no conftest, no CI test step — deploy is a raw SSH + `docker compose up`). This plan introduces pytest from scratch, scoped to the new `prospects` router only. Don't feel obligated to backfill tests for `leads`/`auth` — out of scope.
- For local dev/testing, this plan uses Cloudflare's official published **test** Turnstile keys (not secret, safe to commit to local `.env` files, publicly documented by Cloudflare for exactly this purpose):
  - Sitekey (always passes): `1x00000000000000000000AA`
  - Secret key (always passes): `1x0000000000000000000000000000000AA`
  - Sitekey (always blocks): `2x00000000000000000000AB` — useful for manually testing the failure path.
  Before going to production, the user must replace these with real keys from their own Cloudflare Turnstile site (dash.cloudflare.com → Turnstile). That swap happens in the **production** `.env` files, which this plan does not touch.

---

## Task 1: `Prospect` SQLAlchemy model

**Files:**
- Create: `backend/app/models/prospect.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Create the model**

```python
# backend/app/models/prospect.py
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from ..database import Base


class Prospect(Base):
    __tablename__ = "prospects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50))
    company = Column(String(255))
    service = Column(String(100))
    message = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
```

This mirrors the table already deployed on the dev DB exactly (verified via `SHOW CREATE TABLE prospects`).

- [ ] **Step 2: Register it in the models package**

Modify `backend/app/models/__init__.py`:

```python
from .user import User
from .lead import Lead
from .prospect import Prospect

__all__ = ["User", "Lead", "Prospect"]
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/prospect.py backend/app/models/__init__.py
git commit -m "feat: add Prospect model for contact form submissions"
```

---

## Task 2: Pydantic schemas for prospects

**Files:**
- Create: `backend/app/schemas/prospect.py`

- [ ] **Step 1: Create the schemas**

```python
# backend/app/schemas/prospect.py
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class ProspectCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    service: Optional[str] = None
    message: Optional[str] = None
    turnstile_token: str


class ProspectResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    service: Optional[str] = None
    message: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
```

`turnstile_token` only exists on `ProspectCreate` — it is never persisted and never appears in `ProspectResponse`.

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/prospect.py
git commit -m "feat: add Prospect request/response schemas"
```

---

## Task 3: Turnstile server-side verification helper

**Files:**
- Create: `backend/app/core/turnstile.py`
- Modify: `backend/app/config.py`

- [ ] **Step 1: Add the `TURNSTILE_SECRET_KEY` setting**

Modify `backend/app/config.py` — add one line inside the `Settings` class, after `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`:

```python
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    TURNSTILE_SECRET_KEY: str = ""

    BACKEND_CORS_ORIGINS: List[str] = [
```

- [ ] **Step 2: Write the verification helper**

```python
# backend/app/core/turnstile.py
from typing import Optional
import httpx
from ..config import settings

TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def verify_turnstile_token(token: str, remote_ip: Optional[str] = None) -> bool:
    payload = {"secret": settings.TURNSTILE_SECRET_KEY, "response": token}
    if remote_ip:
        payload["remoteip"] = remote_ip

    try:
        response = httpx.post(TURNSTILE_VERIFY_URL, data=payload, timeout=5.0)
        response.raise_for_status()
    except httpx.HTTPError:
        return False

    return response.json().get("success", False)
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/core/turnstile.py backend/app/config.py
git commit -m "feat: add Cloudflare Turnstile server-side verification"
```

---

## Task 4: Rate limiter module

**Files:**
- Create: `backend/app/core/limiter.py`
- Modify: `backend/requirements.txt`

Kept in its own module (rather than defined in `main.py`) so `app/routers/prospects.py` can import it without creating a circular import with `main.py`.

- [ ] **Step 1: Add dependencies**

Modify `backend/requirements.txt` — add these two lines at the end:

```
slowapi==0.1.9
httpx==0.27.2
```

- [ ] **Step 2: Install locally**

```bash
cd backend && pip install -r requirements.txt
```

- [ ] **Step 3: Create the limiter module**

```python
# backend/app/core/limiter.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/core/limiter.py backend/requirements.txt
git commit -m "feat: add shared rate limiter instance"
```

---

## Task 5: Prospects router

**Files:**
- Create: `backend/app/routers/prospects.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Write the router**

```python
# backend/app/routers/prospects.py
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from ..core.deps import get_db, get_current_user
from ..core.limiter import limiter
from ..core.turnstile import verify_turnstile_token
from ..models.prospect import Prospect
from ..models.user import User
from ..schemas.prospect import ProspectCreate, ProspectResponse

router = APIRouter(prefix="/prospects", tags=["prospects"])


@router.post("/", response_model=ProspectResponse, status_code=201)
@limiter.limit("5/hour")
def create_prospect(
    request: Request,
    body: ProspectCreate,
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

Note the decorator order: `@router.post(...)` outer, `@limiter.limit(...)` inner — this is required by `slowapi` and must be preserved (reversing them silently disables rate limiting).

- [ ] **Step 2: Wire the router, limiter, and exception handler into the app**

Modify `backend/app/main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from .config import settings
from .database import engine, Base
from .core.limiter import limiter
from .routers import auth, leads, prospects

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Lyratech API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(leads.router, prefix="/api")
app.include_router(prospects.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "service": "lyratech-api"}
```

- [ ] **Step 3: Manually smoke-test the endpoint**

Set the dev Turnstile test secret locally first (see Task 8 for the permanent `.env` change) — or export it inline for a quick check:

```bash
cd backend
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA uvicorn app.main:app --reload
```

In another terminal:

```bash
curl -s -X POST http://localhost:8000/api/prospects/ \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","service":"automatizaciones","message":"hola","turnstile_token":"any-value-works-with-test-secret"}'
```

Expected: HTTP 201 with the created prospect JSON (Cloudflare's "always passes" test secret accepts any token string).

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X GET http://localhost:8000/api/prospects/
```

Expected: `403` (no `Authorization` header — matches `HTTPBearer`'s default behavior).

Stop the server (Ctrl+C) once confirmed.

- [ ] **Step 4: Commit**

```bash
git add backend/app/routers/prospects.py backend/app/main.py
git commit -m "feat: add public prospect submission endpoint with rate limiting"
```

---

## Task 6: `init.sql` migration

**Files:**
- Modify: `backend/database/init.sql`

- [ ] **Step 1: Append the `prospects` table DDL**

Add at the end of `backend/database/init.sql` (after the closing `leads` table statement):

```sql

-- --------------------------------------------------------
-- Prospects (public contact form submissions)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS prospects (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    phone       VARCHAR(50),
    company     VARCHAR(255),
    service     VARCHAR(100),
    message     TEXT,
    created_at  DATETIME DEFAULT (now()),
    INDEX ix_prospects_id (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

This matches the collation of the table already deployed on the dev server exactly (`utf8mb4_0900_ai_ci`, different from the `utf8mb4_unicode_ci` used by `users`/`leads` — intentional, not a typo, since it must match what's already live).

- [ ] **Step 2: Commit**

```bash
git add backend/database/init.sql
git commit -m "chore: add prospects table to init.sql migration"
```

---

## Task 7: Backend tests (pytest introduced from scratch)

**Files:**
- Create: `backend/pytest.ini`
- Create: `backend/requirements-dev.txt`
- Create: `backend/app/tests/__init__.py`
- Create: `backend/app/tests/conftest.py`
- Create: `backend/app/tests/test_prospects.py`

- [ ] **Step 1: Add pytest as a dev-only dependency**

```
# backend/requirements-dev.txt
-r requirements.txt
pytest==8.3.3
```

```bash
cd backend && pip install -r requirements-dev.txt
```

- [ ] **Step 2: Add pytest config so `app` resolves as a package regardless of invocation directory**

```ini
# backend/pytest.ini
[pytest]
pythonpath = .
```

- [ ] **Step 3: Create the empty tests package marker**

```python
# backend/app/tests/__init__.py
```

- [ ] **Step 4: Write `conftest.py`**

This builds an isolated FastAPI app containing *only* the `prospects` router, backed by an in-memory SQLite database — it deliberately does **not** import `app.main`, because `app.main` calls `Base.metadata.create_all(bind=engine)` at import time against the real MySQL dev server, which would make tests network-dependent and slow.

```python
# backend/app/tests/conftest.py
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
from ..core.deps import get_db
from ..core.limiter import limiter
from ..routers import prospects

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
```

- [ ] **Step 5: Write the failing tests**

```python
# backend/app/tests/test_prospects.py
VALID_PAYLOAD = {
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "phone": "+52 555 000 0000",
    "company": "Acme",
    "service": "automatizaciones",
    "message": "Quiero saber más",
    "turnstile_token": "test-token",
}


def test_create_prospect_success(client, monkeypatch):
    monkeypatch.setattr(
        "app.routers.prospects.verify_turnstile_token",
        lambda token, remote_ip=None: True,
    )
    response = client.post("/api/prospects/", json=VALID_PAYLOAD)
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Ada Lovelace"
    assert body["email"] == "ada@example.com"
    assert "turnstile_token" not in body


def test_create_prospect_turnstile_failure(client, monkeypatch):
    monkeypatch.setattr(
        "app.routers.prospects.verify_turnstile_token",
        lambda token, remote_ip=None: False,
    )
    response = client.post("/api/prospects/", json=VALID_PAYLOAD)
    assert response.status_code == 400


def test_create_prospect_rate_limited(client, monkeypatch):
    monkeypatch.setattr(
        "app.routers.prospects.verify_turnstile_token",
        lambda token, remote_ip=None: True,
    )
    for _ in range(5):
        assert client.post("/api/prospects/", json=VALID_PAYLOAD).status_code == 201

    response = client.post("/api/prospects/", json=VALID_PAYLOAD)
    assert response.status_code == 429


def test_list_prospects_requires_auth(client):
    response = client.get("/api/prospects/")
    assert response.status_code == 403


def test_delete_prospect_requires_auth(client):
    response = client.delete("/api/prospects/1")
    assert response.status_code == 403
```

- [ ] **Step 6: Run the tests to verify they fail correctly first (sanity check on a clean checkout)**

```bash
cd backend && pytest app/tests -v
```

Expected at this point: all 5 tests **pass** already, since Tasks 1–5 (model, schemas, router, main.py wiring) are already implemented by the time this task runs. This step is a full-suite smoke test, not a red/green TDD step — confirm all 5 `PASSED`.

If any fail, do not proceed — debug against Tasks 1–5 first.

- [ ] **Step 7: Commit**

```bash
git add backend/pytest.ini backend/requirements-dev.txt backend/app/tests
git commit -m "test: add pytest suite for the prospects endpoint"
```

---

## Task 8: Backend env var wiring

**Files:**
- Modify: `.env.example` (repo root)
- Modify: `backend/.env`

- [ ] **Step 1: Document the new key in the example file**

Modify `.env.example` — add one line under the `# --- Backend ---` section:

```
# --- Backend ---
JWT_SECRET_KEY=
JWT_ALGORITHM=
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=
TURNSTILE_SECRET_KEY=

BACKEND_CORS_ORIGINS=
```

- [ ] **Step 2: Set the local dev value using Cloudflare's public test secret**

Modify `backend/.env` — add this line under the `# --- Backend ---` section (after `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`):

```
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

This is Cloudflare's officially published "always passes" Turnstile test secret — safe for local/dev, not a real credential. **This must be replaced with the real secret key from the user's Cloudflare Turnstile dashboard before this key is ever set in a production `.env`.**

- [ ] **Step 3: Commit**

```bash
git add .env.example backend/.env
git commit -m "chore: add TURNSTILE_SECRET_KEY env var (dev uses Cloudflare test secret)"
```

---

## Task 9: `lib/api.ts` — Prospect types and API calls

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Add an `ApiError` class carrying the HTTP status**

Insert near the top of the file, right after the `getToken` function (before `request<T>`):

```ts
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
```

- [ ] **Step 2: Make the shared `request()` helper throw `ApiError`**

Find this block inside `request<T>`:

```ts
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error desconocido" }));
    throw new Error(err.detail || "Error en la solicitud");
  }
```

Replace with:

```ts
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error desconocido" }));
    throw new ApiError(err.detail || "Error en la solicitud", res.status);
  }
```

- [ ] **Step 3: Add the `Prospect` type and `prospectsApi`**

Add after the existing `leadsApi` export at the end of the file:

```ts
export interface Prospect {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  service?: string;
  message?: string;
  created_at: string;
}

export interface ProspectSubmit {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  service?: string;
  message?: string;
  turnstile_token: string;
}

export const prospectsApi = {
  list: () => request<Prospect[]>("/api/prospects/"),
  remove: (id: number) => request<void>(`/api/prospects/${id}`, { method: "DELETE" }),
};

export async function submitProspect(data: ProspectSubmit): Promise<Prospect> {
  const res = await fetch(`${API_URL}/api/prospects/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Error desconocido" }));
    throw new ApiError(err.detail || "Error en la solicitud", res.status);
  }
  return res.json();
}
```

`submitProspect` is deliberately standalone (not routed through `request()`) since it must work for anonymous site visitors and must never attach an `Authorization` header.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: add Prospect API client and typed ApiError"
```

---

## Task 10: Extract shared lead constants

**Files:**
- Create: `frontend/src/lib/leadConstants.ts`

Pulled out of `dashboard/leads/page.tsx` so both the leads page and the new `LeadFormModal` (Task 11) can share them without duplication.

- [ ] **Step 1: Create the file**

```ts
// frontend/src/lib/leadConstants.ts
import type { LeadStatus } from "@/lib/api";

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  qualified: "Calificado",
  proposal: "Propuesta",
  closed: "Cerrado",
  lost: "Perdido",
};

export const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue/20 text-blue border-blue/30",
  contacted: "bg-lyratech-purple/20 text-lyratech-purple border-lyratech-purple/30",
  qualified: "bg-lyratech-green/20 text-lyratech-green border-lyratech-green/30",
  proposal: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
  closed: "bg-lyratech-green/30 text-lyratech-green border-lyratech-green/40",
  lost: "bg-red/20 text-red border-red/30",
};

export const SOURCES = ["Web", "Referido", "Redes sociales", "Email", "Evento", "Otro"];
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/leadConstants.ts
git commit -m "refactor: extract shared lead constants"
```

---

## Task 11: Extract `LeadFormModal` component

**Files:**
- Create: `frontend/src/components/Dashboard/LeadFormModal.tsx`

Extracted verbatim (same markup, same validation, same behavior) from the inline modal currently in `dashboard/leads/page.tsx`, so it can also be used by the new prospects page's "convert to lead" action.

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/Dashboard/LeadFormModal.tsx
"use client";

import React, { useState } from "react";
import { HiOutlineX, HiOutlineCheck } from "react-icons/hi";
import { leadsApi } from "@/lib/api";
import type { Lead, LeadCreate, LeadStatus } from "@/lib/api";
import { STATUS_LABELS, SOURCES } from "@/lib/leadConstants";

interface LeadFormModalProps {
  editing: Lead | null;
  initialForm: LeadCreate;
  onClose: () => void;
  onSaved: (lead: Lead) => void;
}

function toFormValues(lead: Lead): LeadCreate {
  return {
    name: lead.name,
    email: lead.email || "",
    phone: lead.phone || "",
    company: lead.company || "",
    status: lead.status,
    source: lead.source || "",
    notes: lead.notes || "",
  };
}

export default function LeadFormModal({ editing, initialForm, onClose, onSaved }: LeadFormModalProps) {
  const [form, setForm] = useState<LeadCreate>(editing ? toFormValues(editing) : initialForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    const email = form.email ?? "";
    const phone = form.phone ?? "";
    if (!form.name.trim()) errors.name = "El nombre es requerido";
    if (!email.trim() && !phone.trim())
      errors.contact = "Ingresa al menos un email o teléfono";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = "Ingresa un correo válido";
    if (!form.source) errors.source = "La fuente es requerida";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) return;
    setSaving(true);
    setFormError("");
    try {
      const saved = editing
        ? await leadsApi.update(editing.id, form)
        : await leadsApi.create(form);
      onSaved(saved);
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-black/5">
          <h2 className="font-montserrat-bold text-dark-blue text-lg">
            {editing ? "Editar lead" : "Nuevo lead"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-beige text-dark-blue/50 hover:text-dark-blue transition-colors">
            <HiOutlineX size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
              Nombre <span className="text-red">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => { setForm({ ...form, name: e.target.value }); setFieldErrors((p) => ({ ...p, name: "" })); }}
              className={`w-full border rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none transition-all ${fieldErrors.name ? "border-red bg-red/5 focus:border-red focus:ring-1 focus:ring-red" : "border-black/15 focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple"}`}
              placeholder="Nombre completo"
            />
            {fieldErrors.name && <p className="text-red text-xs font-montserrat mt-1">{fieldErrors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
                Email <span className="text-red">*</span>
              </label>
              <input
                type="text"
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setFieldErrors((p) => ({ ...p, email: "", contact: "" })); }}
                className={`w-full border rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none transition-all ${fieldErrors.email || fieldErrors.contact ? "border-red bg-red/5 focus:border-red focus:ring-1 focus:ring-red" : "border-black/15 focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple"}`}
                placeholder="email@ejemplo.com"
              />
              {fieldErrors.email && <p className="text-red text-xs font-montserrat mt-1">{fieldErrors.email}</p>}
            </div>
            <div>
              <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
                Teléfono <span className="text-red">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => { setForm({ ...form, phone: e.target.value }); setFieldErrors((p) => ({ ...p, contact: "" })); }}
                className={`w-full border rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none transition-all ${fieldErrors.contact ? "border-red bg-red/5 focus:border-red focus:ring-1 focus:ring-red" : "border-black/15 focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple"}`}
                placeholder="+52 000 000 0000"
              />
            </div>
          </div>
          {fieldErrors.contact && (
            <p className="text-red text-xs font-montserrat -mt-2">{fieldErrors.contact}</p>
          )}

          <div>
            <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">Empresa</label>
            <input
              type="text"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="w-full border border-black/15 rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple transition-all"
              placeholder="Nombre de la empresa"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">Estado</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}
                className="w-full border border-black/15 rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none focus:border-lyratech-purple transition-all bg-white"
              >
                {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
                Fuente <span className="text-red">*</span>
              </label>
              <select
                value={form.source}
                onChange={(e) => { setForm({ ...form, source: e.target.value }); setFieldErrors((p) => ({ ...p, source: "" })); }}
                className={`w-full border rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none transition-all bg-white ${fieldErrors.source ? "border-red bg-red/5 focus:border-red" : "border-black/15 focus:border-lyratech-purple"}`}
              >
                <option value="">Seleccionar...</option>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {fieldErrors.source && <p className="text-red text-xs font-montserrat mt-1">{fieldErrors.source}</p>}
            </div>
          </div>

          <div>
            <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">Notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full border border-black/15 rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple transition-all resize-none"
              placeholder="Notas adicionales sobre el lead..."
            />
          </div>

          {formError && (
            <div className="bg-red/10 border border-red/30 text-red rounded-lg px-4 py-2.5 text-sm font-montserrat">
              {formError}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 border border-black/15 text-dark-blue/70 hover:text-dark-blue font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm hover:bg-beige"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-lyratech-purple hover:bg-button-light-purple disabled:opacity-50 text-white font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm shadow-button hover:scale-[1.02]"
            >
              <HiOutlineCheck size={16} />
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear lead"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/Dashboard/LeadFormModal.tsx
git commit -m "refactor: extract LeadFormModal component"
```

---

## Task 12: Refactor `dashboard/leads/page.tsx` to use the extracted pieces

**Files:**
- Modify: `frontend/src/app/dashboard/leads/page.tsx`

This is a behavior-preserving refactor — the leads page must work exactly as before (create, edit, delete, search, filter) after this change.

- [ ] **Step 1: Replace the imports and remove the now-shared constants**

Find:

```tsx
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineX,
  HiOutlineCheck,
} from "react-icons/hi";
import DashboardShell from "@/components/Dashboard/DashboardShell";
import { leadsApi, auth } from "@/lib/api";
import type { Lead, LeadCreate, LeadStatus, UserInfo } from "@/lib/api";

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  qualified: "Calificado",
  proposal: "Propuesta",
  closed: "Cerrado",
  lost: "Perdido",
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue/20 text-blue border-blue/30",
  contacted: "bg-lyratech-purple/20 text-lyratech-purple border-lyratech-purple/30",
  qualified: "bg-lyratech-green/20 text-lyratech-green border-lyratech-green/30",
  proposal: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
  closed: "bg-lyratech-green/30 text-lyratech-green border-lyratech-green/40",
  lost: "bg-red/20 text-red border-red/30",
};

const SOURCES = ["Web", "Referido", "Redes sociales", "Email", "Evento", "Otro"];
const EMPTY_FORM: LeadCreate = {
  name: "",
  email: "",
  phone: "",
  company: "",
  status: "new",
  source: "",
  notes: "",
};
```

Replace with:

```tsx
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlinePencil,
  HiOutlineTrash,
} from "react-icons/hi";
import DashboardShell from "@/components/Dashboard/DashboardShell";
import LeadFormModal from "@/components/Dashboard/LeadFormModal";
import { leadsApi, auth } from "@/lib/api";
import type { Lead, LeadCreate, LeadStatus, UserInfo } from "@/lib/api";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/leadConstants";

const EMPTY_FORM: LeadCreate = {
  name: "",
  email: "",
  phone: "",
  company: "",
  status: "new",
  source: "",
  notes: "",
};
```

- [ ] **Step 2: Simplify component state and remove the extracted form logic**

Find (component body from the `LeadsPage` function signature through `handleDelete`):

```tsx
export default function LeadsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filtered, setFiltered] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [form, setForm] = useState<LeadCreate>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    try {
      const [userData, leadsData] = await Promise.all([auth.me(), leadsApi.list()]);
      setUser(userData);
      setLeads(leadsData);
    } catch {
      router.push("/dashboard/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!localStorage.getItem("lyratech_token")) {
      router.push("/dashboard/login");
      return;
    }
    loadData();
  }, [loadData, router]);

  useEffect(() => {
    let list = leads;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.company?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") list = list.filter((l) => l.status === statusFilter);
    setFiltered(list);
  }, [leads, search, statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setFieldErrors({});
    setShowModal(true);
  }

  function openEdit(lead: Lead) {
    setEditing(lead);
    setForm({
      name: lead.name,
      email: lead.email || "",
      phone: lead.phone || "",
      company: lead.company || "",
      status: lead.status,
      source: lead.source || "",
      notes: lead.notes || "",
    });
    setFormError("");
    setFieldErrors({});
    setShowModal(true);
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    const email = form.email ?? "";
    const phone = form.phone ?? "";
    if (!form.name.trim()) errors.name = "El nombre es requerido";
    if (!email.trim() && !phone.trim())
      errors.contact = "Ingresa al menos un email o teléfono";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = "Ingresa un correo válido";
    if (!form.source) errors.source = "La fuente es requerida";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) return;
    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        const updated = await leadsApi.update(editing.id, form);
        setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      } else {
        const created = await leadsApi.create(form);
        setLeads((prev) => [created, ...prev]);
      }
      setShowModal(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await leadsApi.remove(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch { /* ignore */ } finally {
      setDeleteId(null);
    }
  }
```

Replace with:

```tsx
export default function LeadsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filtered, setFiltered] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [userData, leadsData] = await Promise.all([auth.me(), leadsApi.list()]);
      setUser(userData);
      setLeads(leadsData);
    } catch {
      router.push("/dashboard/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!localStorage.getItem("lyratech_token")) {
      router.push("/dashboard/login");
      return;
    }
    loadData();
  }, [loadData, router]);

  useEffect(() => {
    let list = leads;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.company?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") list = list.filter((l) => l.status === statusFilter);
    setFiltered(list);
  }, [leads, search, statusFilter]);

  function openCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function openEdit(lead: Lead) {
    setEditing(lead);
    setShowModal(true);
  }

  function handleSaved(saved: Lead) {
    setLeads((prev) =>
      prev.some((l) => l.id === saved.id)
        ? prev.map((l) => (l.id === saved.id ? saved : l))
        : [saved, ...prev]
    );
  }

  async function handleDelete(id: number) {
    try {
      await leadsApi.remove(id);
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch { /* ignore */ } finally {
      setDeleteId(null);
    }
  }
```

- [ ] **Step 3: Replace the inline modal JSX with `LeadFormModal`**

Find the entire `{/* Create / Edit Modal */}` block:

```tsx
      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-black/5">
              <h2 className="font-montserrat-bold text-dark-blue text-lg">
                {editing ? "Editar lead" : "Nuevo lead"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-beige text-dark-blue/50 hover:text-dark-blue transition-colors">
                <HiOutlineX size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Nombre */}
              <div>
                <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
                  Nombre <span className="text-red">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); setFieldErrors((p) => ({ ...p, name: "" })); }}
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none transition-all ${fieldErrors.name ? "border-red bg-red/5 focus:border-red focus:ring-1 focus:ring-red" : "border-black/15 focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple"}`}
                  placeholder="Nombre completo"
                />
                {fieldErrors.name && <p className="text-red text-xs font-montserrat mt-1">{fieldErrors.name}</p>}
              </div>

              {/* Email + Teléfono */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
                    Email <span className="text-red">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.email}
                    onChange={(e) => { setForm({ ...form, email: e.target.value }); setFieldErrors((p) => ({ ...p, email: "", contact: "" })); }}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none transition-all ${fieldErrors.email || fieldErrors.contact ? "border-red bg-red/5 focus:border-red focus:ring-1 focus:ring-red" : "border-black/15 focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple"}`}
                    placeholder="email@ejemplo.com"
                  />
                  {fieldErrors.email && <p className="text-red text-xs font-montserrat mt-1">{fieldErrors.email}</p>}
                </div>
                <div>
                  <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
                    Teléfono <span className="text-red">*</span>
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => { setForm({ ...form, phone: e.target.value }); setFieldErrors((p) => ({ ...p, contact: "" })); }}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none transition-all ${fieldErrors.contact ? "border-red bg-red/5 focus:border-red focus:ring-1 focus:ring-red" : "border-black/15 focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple"}`}
                    placeholder="+52 000 000 0000"
                  />
                </div>
              </div>
              {fieldErrors.contact && (
                <p className="text-red text-xs font-montserrat -mt-2">{fieldErrors.contact}</p>
              )}

              {/* Empresa */}
              <div>
                <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">Empresa</label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="w-full border border-black/15 rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple transition-all"
                  placeholder="Nombre de la empresa"
                />
              </div>

              {/* Estado + Fuente */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">Estado</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}
                    className="w-full border border-black/15 rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none focus:border-lyratech-purple transition-all bg-white"
                  >
                    {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">
                    Fuente <span className="text-red">*</span>
                  </label>
                  <select
                    value={form.source}
                    onChange={(e) => { setForm({ ...form, source: e.target.value }); setFieldErrors((p) => ({ ...p, source: "" })); }}
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none transition-all bg-white ${fieldErrors.source ? "border-red bg-red/5 focus:border-red" : "border-black/15 focus:border-lyratech-purple"}`}
                  >
                    <option value="">Seleccionar...</option>
                    {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {fieldErrors.source && <p className="text-red text-xs font-montserrat mt-1">{fieldErrors.source}</p>}
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block font-montserrat text-dark-blue/70 text-sm mb-1.5">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full border border-black/15 rounded-xl px-4 py-2.5 text-sm font-montserrat text-dark-blue outline-none focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple transition-all resize-none"
                  placeholder="Notas adicionales sobre el lead..."
                />
              </div>

              {formError && (
                <div className="bg-red/10 border border-red/30 text-red rounded-lg px-4 py-2.5 text-sm font-montserrat">
                  {formError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-black/15 text-dark-blue/70 hover:text-dark-blue font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm hover:bg-beige"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-lyratech-purple hover:bg-button-light-purple disabled:opacity-50 text-white font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm shadow-button hover:scale-[1.02]"
                >
                  <HiOutlineCheck size={16} />
                  {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear lead"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
```

Replace with:

```tsx
      {/* Create / Edit Modal */}
      {showModal && (
        <LeadFormModal
          editing={editing}
          initialForm={EMPTY_FORM}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}
```

- [ ] **Step 4: Run the frontend dev server and manually verify the leads page still works**

```bash
cd frontend && npm run dev
```

Open `http://localhost:3000/dashboard/leads`, log in, and verify:
- "Nuevo lead" opens an empty modal, saving adds a row to the table.
- Clicking the pencil icon on a row opens the modal pre-filled, saving updates that row.
- Validation errors (missing name, missing email+phone, invalid email, missing source) still show inline.
- Deleting a row still works.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/dashboard/leads/page.tsx
git commit -m "refactor: leads page uses extracted LeadFormModal and leadConstants"
```

---

## Task 13: Turnstile ambient types

**Files:**
- Modify: `frontend/global.d.ts`

- [ ] **Step 1: Add the `window.turnstile` typing**

Append to the end of `frontend/global.d.ts`:

```ts

interface TurnstileRenderOptions {
  sitekey: string;
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

declare interface Window {
  turnstile?: TurnstileApi;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/global.d.ts
git commit -m "chore: add ambient types for the Cloudflare Turnstile script"
```

---

## Task 14: Contact form translations

**Files:**
- Modify: `frontend/src/messages/es.json`
- Modify: `frontend/src/messages/en.json`
- Modify: `frontend/src/messages/fr.json`
- Modify: `frontend/src/messages/de.json`

- [ ] **Step 1: Add 4 new keys to `es.json`**

Find (inside `contactForm`):

```json
    "submitButton": "Enviar mensaje",
```

Replace with:

```json
    "submitButton": "Enviar mensaje",
    "submittingButton": "Enviando...",
    "errorGeneric": "Ocurrió un error al enviar tu mensaje. Intenta de nuevo.",
    "errorRateLimited": "Demasiados intentos. Intenta de nuevo más tarde.",
    "errorTurnstile": "No se pudo verificar que eres humano. Intenta de nuevo.",
```

- [ ] **Step 2: Add the equivalent keys to `en.json`**

Find:

```json
    "submitButton": "Send message",
```

Replace with:

```json
    "submitButton": "Send message",
    "submittingButton": "Sending...",
    "errorGeneric": "Something went wrong sending your message. Please try again.",
    "errorRateLimited": "Too many attempts. Please try again later.",
    "errorTurnstile": "We couldn't verify you're human. Please try again.",
```

- [ ] **Step 3: Add the equivalent keys to `fr.json`**

Find:

```json
    "submitButton": "Envoyer le message",
```

Replace with:

```json
    "submitButton": "Envoyer le message",
    "submittingButton": "Envoi en cours...",
    "errorGeneric": "Une erreur s'est produite lors de l'envoi de votre message. Veuillez réessayer.",
    "errorRateLimited": "Trop de tentatives. Veuillez réessayer plus tard.",
    "errorTurnstile": "Nous n'avons pas pu vérifier que vous êtes humain. Veuillez réessayer.",
```

- [ ] **Step 4: Add the equivalent keys to `de.json`**

Find:

```json
    "submitButton": "Nachricht senden",
```

Replace with:

```json
    "submitButton": "Nachricht senden",
    "submittingButton": "Wird gesendet...",
    "errorGeneric": "Beim Senden Ihrer Nachricht ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.",
    "errorRateLimited": "Zu viele Versuche. Bitte versuchen Sie es später erneut.",
    "errorTurnstile": "Wir konnten nicht überprüfen, dass Sie ein Mensch sind. Bitte versuchen Sie es erneut.",
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/messages/es.json frontend/src/messages/en.json frontend/src/messages/fr.json frontend/src/messages/de.json
git commit -m "i18n: add contact form submission error/loading strings"
```

---

## Task 15: Wire `ContactForm` to the API with Turnstile

**Files:**
- Modify: `frontend/src/components/Contact/ContactForm/index.tsx`

- [ ] **Step 1: Update imports**

Find:

```tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { MdEmail, MdPhone } from "react-icons/md";
import { FaBuilding } from "react-icons/fa";
import { HiChevronDown, HiCalendar } from "react-icons/hi";
import BookingModal from "@/components/shared/BookingModal";
import { useTranslations } from "next-intl";
```

Replace with:

```tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Script from "next/script";
import { motion } from "framer-motion";
import { MdEmail, MdPhone } from "react-icons/md";
import { FaBuilding } from "react-icons/fa";
import { HiChevronDown, HiCalendar } from "react-icons/hi";
import BookingModal from "@/components/shared/BookingModal";
import { useTranslations } from "next-intl";
import { submitProspect, ApiError } from "@/lib/api";
```

- [ ] **Step 2: Add new state right after `const [submitted, setSubmitted] = useState(false);`**

Find:

```tsx
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, boolean>>>({});
    const [submitted, setSubmitted] = useState(false);
```

Replace with:

```tsx
    const [errors, setErrors] = useState<Partial<Record<keyof FormState, boolean>>>({});
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");
    const [turnstileToken, setTurnstileToken] = useState("");
    const [turnstileReady, setTurnstileReady] = useState(false);
    const turnstileContainerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
```

- [ ] **Step 3: Add the Turnstile render effect after the existing click-outside effect**

Find:

```tsx
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (serviceRef.current && !serviceRef.current.contains(e.target as Node)) {
                setServiceOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
```

Replace with:

```tsx
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (serviceRef.current && !serviceRef.current.contains(e.target as Node)) {
                setServiceOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const renderTurnstile = useCallback(() => {
        if (!turnstileContainerRef.current || !window.turnstile || widgetIdRef.current) return;
        widgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
            sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
            callback: (token: string) => setTurnstileToken(token),
            "expired-callback": () => setTurnstileToken(""),
        });
    }, []);

    useEffect(() => {
        if (turnstileReady) renderTurnstile();
    }, [turnstileReady, renderTurnstile]);
```

- [ ] **Step 4: Replace `handleSubmit`**

Find:

```tsx
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Partial<Record<keyof FormState, boolean>> = {};
        (Object.keys(form) as (keyof FormState)[]).forEach((key) => {
            if (!form[key].trim()) newErrors[key] = true;
        });
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;
        // TODO: Connect to API
        setSubmitted(true);
    };
```

Replace with:

```tsx
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Partial<Record<keyof FormState, boolean>> = {};
        (Object.keys(form) as (keyof FormState)[]).forEach((key) => {
            if (!form[key].trim()) newErrors[key] = true;
        });
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        setSubmitError("");
        if (!turnstileToken) {
            setSubmitError(t("errorTurnstile"));
            return;
        }

        setSubmitting(true);
        try {
            await submitProspect({
                name: form.name,
                email: form.email,
                phone: form.phone,
                company: form.company,
                service: form.service,
                message: form.message,
                turnstile_token: turnstileToken,
            });
            setSubmitted(true);
        } catch (err) {
            if (err instanceof ApiError && err.status === 429) {
                setSubmitError(t("errorRateLimited"));
            } else if (err instanceof ApiError && err.status === 400) {
                setSubmitError(t("errorTurnstile"));
            } else {
                setSubmitError(t("errorGeneric"));
            }
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.reset(widgetIdRef.current);
            }
            setTurnstileToken("");
        } finally {
            setSubmitting(false);
        }
    };
```

- [ ] **Step 5: Load the Turnstile script**

Find:

```tsx
        <section className="py-16 mx-6 md:mx-16 lg:mx-20 xl:mx-28 font-montserrat" id="contact-form">
            <BookingModal
                isOpen={bookingOpen}
                onClose={() => setBookingOpen(false)}
                title={t("scheduleButton")}
            />
```

Replace with:

```tsx
        <section className="py-16 mx-6 md:mx-16 lg:mx-20 xl:mx-28 font-montserrat" id="contact-form">
            <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js"
                strategy="afterInteractive"
                onLoad={() => setTurnstileReady(true)}
            />
            <BookingModal
                isOpen={bookingOpen}
                onClose={() => setBookingOpen(false)}
                title={t("scheduleButton")}
            />
```

- [ ] **Step 6: Add the widget container, error message, and update the submit button**

Find:

```tsx
                            {/* Message */}
                            <div className="mt-4 flex flex-col gap-1">
                                <textarea
                                    rows={5}
                                    placeholder={t("messagePlaceholder")}
                                    value={form.message}
                                    onChange={(e) => handleChange("message", e.target.value)}
                                    className={`${fieldClass(!!errors.message)} resize-none`}
                                />
                                {errors.message && (
                                    <span className="text-red/70 text-xs font-semibold pl-1 flex items-center gap-1">
                                        <span>•</span> {t("requiredField")}
                                    </span>
                                )}
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                className="mt-6 w-full bg-lyratech-purple text-white font-montserrat-bold py-4 rounded-xl hover:bg-button-dark-purple transition-colors duration-200"
                            >
                                {t("submitButton")}
                            </button>
```

Replace with:

```tsx
                            {/* Message */}
                            <div className="mt-4 flex flex-col gap-1">
                                <textarea
                                    rows={5}
                                    placeholder={t("messagePlaceholder")}
                                    value={form.message}
                                    onChange={(e) => handleChange("message", e.target.value)}
                                    className={`${fieldClass(!!errors.message)} resize-none`}
                                />
                                {errors.message && (
                                    <span className="text-red/70 text-xs font-semibold pl-1 flex items-center gap-1">
                                        <span>•</span> {t("requiredField")}
                                    </span>
                                )}
                            </div>

                            {/* Human verification */}
                            <div className="mt-4" ref={turnstileContainerRef} />

                            {submitError && (
                                <div className="mt-4 bg-[#fff8f8] border border-red/30 text-red rounded-lg px-4 py-2.5 text-sm">
                                    {submitError}
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={submitting}
                                className="mt-6 w-full bg-lyratech-purple text-white font-montserrat-bold py-4 rounded-xl hover:bg-button-dark-purple transition-colors duration-200 disabled:opacity-60"
                            >
                                {submitting ? t("submittingButton") : t("submitButton")}
                            </button>
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/Contact/ContactForm/index.tsx
git commit -m "feat: connect ContactForm to the prospects API with Turnstile verification"
```

---

## Task 16: Frontend Turnstile site key env var

**Files:**
- Modify: `.env.example` (repo root)
- Modify: `frontend/.env.local`

- [ ] **Step 1: Document the new key**

Modify `.env.example` — add under `# --- Frontend ---`:

```
# --- Frontend ---
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_BOOKING_URL=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

- [ ] **Step 2: Set the local dev value using Cloudflare's public test sitekey**

Modify `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=https://localhost:8000
NEXT_PUBLIC_BOOKING_URL=https://calendar.app.google/jgRS9QwCP2nWrrRG8
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

Same caveat as Task 8: this is Cloudflare's public "always passes" test sitekey, fine for local dev, **must be swapped for the real one before production**.

- [ ] **Step 3: Commit**

```bash
git add .env.example frontend/.env.local
git commit -m "chore: add NEXT_PUBLIC_TURNSTILE_SITE_KEY env var (dev uses Cloudflare test key)"
```

---

## Task 17: `/dashboard/prospects` page

**Files:**
- Create: `frontend/src/app/dashboard/prospects/page.tsx`
- Modify: `frontend/src/components/Dashboard/DashboardShell.tsx`

- [ ] **Step 1: Add the nav item**

Find in `frontend/src/components/Dashboard/DashboardShell.tsx`:

```tsx
import {
  HiOutlineUsers,
  HiOutlineLogout,
  HiOutlineCog,
  HiChevronLeft,
  HiChevronRight,
  HiMenuAlt2,
  HiX,
} from "react-icons/hi";
import Logo from "@/assets/images/Navbar/White_Logo.png";
import type { UserInfo } from "@/lib/api";

const NAV_ITEMS = [
  { label: "Leads", href: "/dashboard/leads", icon: HiOutlineUsers },
  { label: "Configuración", href: "/dashboard/settings", icon: HiOutlineCog },
];
```

Replace with:

```tsx
import {
  HiOutlineUsers,
  HiOutlineInboxIn,
  HiOutlineLogout,
  HiOutlineCog,
  HiChevronLeft,
  HiChevronRight,
  HiMenuAlt2,
  HiX,
} from "react-icons/hi";
import Logo from "@/assets/images/Navbar/White_Logo.png";
import type { UserInfo } from "@/lib/api";

const NAV_ITEMS = [
  { label: "Leads", href: "/dashboard/leads", icon: HiOutlineUsers },
  { label: "Prospectos", href: "/dashboard/prospects", icon: HiOutlineInboxIn },
  { label: "Configuración", href: "/dashboard/settings", icon: HiOutlineCog },
];
```

- [ ] **Step 2: Create the prospects page**

```tsx
// frontend/src/app/dashboard/prospects/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineSearch, HiOutlineTrash, HiOutlineSwitchHorizontal } from "react-icons/hi";
import DashboardShell from "@/components/Dashboard/DashboardShell";
import LeadFormModal from "@/components/Dashboard/LeadFormModal";
import { prospectsApi, auth } from "@/lib/api";
import type { Prospect, LeadCreate, UserInfo } from "@/lib/api";

export default function ProspectsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [filtered, setFiltered] = useState<Prospect[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [converting, setConverting] = useState<Prospect | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [userData, prospectsData] = await Promise.all([auth.me(), prospectsApi.list()]);
      setUser(userData);
      setProspects(prospectsData);
    } catch {
      router.push("/dashboard/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!localStorage.getItem("lyratech_token")) {
      router.push("/dashboard/login");
      return;
    }
    loadData();
  }, [loadData, router]);

  useEffect(() => {
    let list = prospects;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.company?.toLowerCase().includes(q)
      );
    }
    setFiltered(list);
  }, [prospects, search]);

  async function handleDelete(id: number) {
    try {
      await prospectsApi.remove(id);
      setProspects((prev) => prev.filter((p) => p.id !== id));
    } catch { /* ignore */ } finally {
      setDeleteId(null);
    }
  }

  function convertInitialForm(prospect: Prospect): LeadCreate {
    const notesParts = [
      prospect.service ? `Servicio de interés: ${prospect.service}` : "",
      prospect.message || "",
    ].filter(Boolean);
    return {
      name: prospect.name,
      email: prospect.email,
      phone: prospect.phone || "",
      company: prospect.company || "",
      status: "new",
      source: "Web",
      notes: notesParts.join("\n\n"),
    };
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-blue flex items-center justify-center">
        <div className="text-white/60 font-montserrat text-sm animate-pulse">Cargando...</div>
      </div>
    );
  }

  return (
    <DashboardShell user={user}>
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-montserrat-bold text-dark-blue text-2xl">Prospectos</h1>
            <p className="font-montserrat text-dark-blue/50 text-sm mt-0.5">
              Envíos del formulario de contacto del sitio web
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-blue/30" size={16} />
            <input
              type="text"
              placeholder="Buscar por nombre, email o empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-black/10 rounded-xl text-sm font-montserrat text-dark-blue placeholder-dark-blue/30 outline-none focus:border-lyratech-purple focus:ring-1 focus:ring-lyratech-purple transition-all"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-montserrat text-dark-blue/40 text-sm">
                {search ? "No hay prospectos que coincidan con la búsqueda" : "Aún no hay prospectos"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/5 bg-beige/60">
                    {["Nombre", "Empresa", "Contacto", "Servicio", "Mensaje", "Fecha", "Acciones"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-montserrat-bold text-dark-blue/50 text-xs uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filtered.map((prospect) => (
                    <tr key={prospect.id} className="hover:bg-beige/40 transition-colors group">
                      <td className="px-4 py-3.5">
                        <p className="font-montserrat font-semibold text-dark-blue text-sm">{prospect.name}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-montserrat text-dark-blue/70 text-sm">{prospect.company || "—"}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-montserrat text-dark-blue/70 text-sm">{prospect.email}</p>
                        <p className="font-montserrat text-dark-blue/40 text-xs">{prospect.phone || ""}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-montserrat text-dark-blue/60 text-sm">{prospect.service || "—"}</span>
                      </td>
                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="font-montserrat text-dark-blue/60 text-sm truncate" title={prospect.message || ""}>
                          {prospect.message || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-montserrat text-dark-blue/40 text-xs">
                          {new Date(prospect.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setConverting(prospect)} className="p-1.5 rounded-lg hover:bg-lyratech-purple/10 text-lyratech-purple transition-colors" title="Convertir a lead">
                            <HiOutlineSwitchHorizontal size={15} />
                          </button>
                          <button onClick={() => setDeleteId(prospect.id)} className="p-1.5 rounded-lg hover:bg-red/10 text-red transition-colors" title="Eliminar">
                            <HiOutlineTrash size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {converting && (
        <LeadFormModal
          editing={null}
          initialForm={convertInitialForm(converting)}
          onClose={() => setConverting(null)}
          onSaved={() => {}}
        />
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-dark-blue/60 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
            <h3 className="font-montserrat-bold text-dark-blue text-lg mb-2">Eliminar prospecto</h3>
            <p className="font-montserrat text-dark-blue/60 text-sm mb-6">
              ¿Estás seguro que deseas eliminar este prospecto? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 border border-black/15 text-dark-blue/70 font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm hover:bg-beige"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteId as number)}
                className="flex-1 bg-red hover:bg-dark-red text-white font-montserrat font-semibold py-2.5 rounded-xl transition-all text-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/dashboard/prospects/page.tsx frontend/src/components/Dashboard/DashboardShell.tsx
git commit -m "feat: add /dashboard/prospects page with convert-to-lead action"
```

---

## Task 18: End-to-end manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start the backend**

```bash
cd backend && uvicorn app.main:app --reload
```

- [ ] **Step 2: Start the frontend**

```bash
cd frontend && npm run dev
```

- [ ] **Step 3: Submit the contact form**

Open `http://localhost:3000/contact` (or the localized path, e.g. `/es/contact`), fill out the form, complete the Turnstile checkbox (it will auto-pass instantly with the test sitekey), and submit. Confirm the success state appears.

- [ ] **Step 4: Verify the row landed in `prospects`**

Log into `http://localhost:3000/dashboard/prospects`. Confirm the submission appears in the table with the correct name/email/service/message.

- [ ] **Step 5: Verify "Convertir a lead"**

Click the convert icon on that row, confirm the Nuevo Lead modal opens pre-filled with the prospect's name/email/phone/company, source "Web", and notes containing the service + message. Save it, then check `http://localhost:3000/dashboard/leads` for the new row.

- [ ] **Step 6: Verify rate limiting**

Submit the contact form 6 times in quick succession (reset the Turnstile widget each time by reloading the page, since tokens are single-use). Confirm the 6th submission shows the rate-limit error message (`errorRateLimited`).

- [ ] **Step 7: Run the backend test suite one more time as a final check**

```bash
cd backend && pytest app/tests -v
```

Expected: all tests pass.
