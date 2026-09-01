# Prevent Double-Submit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop a duplicated submit (double-click, network retry, or a direct API call) from creating two rows, two emails, or two paid OpenRouter calls on the Diagnóstico GO and Contáctanos forms.

**Architecture:** A `useRef`-based synchronous lock in each form's submit handler blocks a second click from firing a second request. A new `used_turnstile_tokens` table in MySQL lets the backend atomically "claim" each Turnstile token exactly once, across both uvicorn worker processes, before doing any expensive work — a second request carrying the same token gets HTTP 409 immediately.

**Tech Stack:** FastAPI + SQLAlchemy (backend), Next.js + React + next-intl (frontend), pytest + SQLite in-memory (backend tests).

**Spec:** `docs/superpowers/specs/2026-09-01-prevent-double-submit-design.md`

---

### Task 1: `UsedTurnstileToken` model

**Files:**
- Create: `backend/app/models/used_turnstile_token.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 1: Create the model**

```python
# backend/app/models/used_turnstile_token.py
from sqlalchemy import Column, DateTime, String
from sqlalchemy.sql import func

from ..database import Base


class UsedTurnstileToken(Base):
    __tablename__ = "used_turnstile_tokens"

    token_hash = Column(String(64), primary_key=True)
    created_at = Column(DateTime, server_default=func.now())
```

- [ ] **Step 2: Register it in `backend/app/models/__init__.py`**

Current content:

```python
from .user import User
from .lead import Lead
from .prospect import Prospect
from .notification_recipient import NotificationRecipient
from .diagnostic_question import DiagnosticQuestion
from .diagnostic_submission import DiagnosticSubmission

__all__ = [
    "User",
    "Lead",
    "Prospect",
    "NotificationRecipient",
    "DiagnosticQuestion",
    "DiagnosticSubmission",
]
```

New content:

```python
from .user import User
from .lead import Lead
from .prospect import Prospect
from .notification_recipient import NotificationRecipient
from .diagnostic_question import DiagnosticQuestion
from .diagnostic_submission import DiagnosticSubmission
from .used_turnstile_token import UsedTurnstileToken

__all__ = [
    "User",
    "Lead",
    "Prospect",
    "NotificationRecipient",
    "DiagnosticQuestion",
    "DiagnosticSubmission",
    "UsedTurnstileToken",
]
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/used_turnstile_token.py backend/app/models/__init__.py
git commit -m "feat: add UsedTurnstileToken model"
```

---

### Task 2: `claim_turnstile_token` / `cleanup_old_turnstile_tokens` helpers

**Files:**
- Create: `backend/app/core/idempotency.py`
- Test: `backend/app/tests/test_idempotency.py`

- [ ] **Step 1: Write the failing tests**

```python
# backend/app/tests/test_idempotency.py
from datetime import datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.core.idempotency import claim_turnstile_token, cleanup_old_turnstile_tokens
from app.models.used_turnstile_token import UsedTurnstileToken


def _session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def test_claim_turnstile_token_succeeds_first_time():
    db = _session()
    assert claim_turnstile_token(db, "token-a") is True
    assert db.query(UsedTurnstileToken).count() == 1


def test_claim_turnstile_token_rejects_reuse():
    db = _session()
    assert claim_turnstile_token(db, "token-a") is True
    assert claim_turnstile_token(db, "token-a") is False
    assert db.query(UsedTurnstileToken).count() == 1


def test_claim_turnstile_token_allows_distinct_tokens():
    db = _session()
    assert claim_turnstile_token(db, "token-a") is True
    assert claim_turnstile_token(db, "token-b") is True
    assert db.query(UsedTurnstileToken).count() == 2


def test_cleanup_removes_only_tokens_older_than_max_age():
    db = _session()
    old = UsedTurnstileToken(
        token_hash="old", created_at=datetime.utcnow() - timedelta(days=31)
    )
    recent = UsedTurnstileToken(token_hash="recent", created_at=datetime.utcnow())
    db.add_all([old, recent])
    db.commit()

    cleanup_old_turnstile_tokens(db)

    remaining = {row.token_hash for row in db.query(UsedTurnstileToken).all()}
    assert remaining == {"recent"}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest app/tests/test_idempotency.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.core.idempotency'`

- [ ] **Step 3: Implement the helpers**

```python
# backend/app/core/idempotency.py
"""Turnstile-token idempotency: lets a request atomically claim a token so
a duplicate submit (double-click, network retry, direct API call) with the
same token is rejected instead of doing the work twice.
"""

import hashlib
from datetime import datetime, timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..models.used_turnstile_token import UsedTurnstileToken


def claim_turnstile_token(db: Session, token: str) -> bool:
    """Atomically claims a Turnstile token. Returns False if it was already
    claimed by another request (this or another uvicorn worker process).
    """
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    db.add(UsedTurnstileToken(token_hash=token_hash))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return False
    return True


def cleanup_old_turnstile_tokens(db: Session, max_age_days: int = 30) -> None:
    """Deletes claimed-token rows older than max_age_days. Housekeeping only —
    claims are checked in real time, this just keeps the table from growing
    unbounded over months/years.
    """
    cutoff = datetime.utcnow() - timedelta(days=max_age_days)
    db.query(UsedTurnstileToken).filter(UsedTurnstileToken.created_at < cutoff).delete()
    db.commit()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest app/tests/test_idempotency.py -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/idempotency.py backend/app/tests/test_idempotency.py
git commit -m "feat: add turnstile-token claim/cleanup helpers"
```

---

### Task 3: Wire the claim into `submit_diagnostic`

**Files:**
- Modify: `backend/app/routers/diagnostics.py`
- Test: `backend/app/tests/test_diagnostics_public.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/app/tests/test_diagnostics_public.py`:

```python
def test_submit_diagnostic_duplicate_token_rejected(client, monkeypatch):
    _seed()
    monkeypatch.setattr(
        "app.routers.diagnostics.verify_turnstile_token", lambda token, remote_ip=None: True
    )
    call_count = {"n": 0}

    def fake_generate(**kwargs):
        call_count["n"] += 1
        return {
            "headline": "LLM headline",
            "summary": "LLM summary",
            "why_it_fits": "LLM why",
            "key_opportunities": ["A"],
            "suggested_next_steps": ["B"],
            "confidence_note": "note",
            "email_subject": "subj",
            "email_preview": "preview",
            "open_answer_en": "",
        }

    monkeypatch.setattr("app.routers.diagnostics.generate_diagnostic", fake_generate)

    first = client.post("/api/diagnostics/submit", json=VALID_SUBMIT_PAYLOAD)
    assert first.status_code == 201

    second = client.post("/api/diagnostics/submit", json=VALID_SUBMIT_PAYLOAD)
    assert second.status_code == 409

    assert call_count["n"] == 1
```

Also update `test_submit_diagnostic_rate_limited`, which currently reuses the
same `turnstile_token` for all 5 calls — after this task, the 2nd through
5th of those would hit the new duplicate-token check (409) instead of
exercising the rate limiter. Give each call its own token:

Current:

```python
def test_submit_diagnostic_rate_limited(client, monkeypatch):
    _seed()
    monkeypatch.setattr(
        "app.routers.diagnostics.verify_turnstile_token", lambda token, remote_ip=None: True
    )
    for _ in range(5):
        assert client.post("/api/diagnostics/submit", json=VALID_SUBMIT_PAYLOAD).status_code == 201

    response = client.post("/api/diagnostics/submit", json=VALID_SUBMIT_PAYLOAD)
    assert response.status_code == 429
```

New:

```python
def test_submit_diagnostic_rate_limited(client, monkeypatch):
    _seed()
    monkeypatch.setattr(
        "app.routers.diagnostics.verify_turnstile_token", lambda token, remote_ip=None: True
    )
    for i in range(5):
        payload = {**VALID_SUBMIT_PAYLOAD, "turnstile_token": f"test-token-{i}"}
        assert client.post("/api/diagnostics/submit", json=payload).status_code == 201

    payload = {**VALID_SUBMIT_PAYLOAD, "turnstile_token": "test-token-5"}
    response = client.post("/api/diagnostics/submit", json=payload)
    assert response.status_code == 429
```

- [ ] **Step 2: Run tests to verify the new one fails**

Run: `cd backend && python -m pytest app/tests/test_diagnostics_public.py -v`
Expected: `test_submit_diagnostic_duplicate_token_rejected` FAILS (second call
returns 201, not 409); the rest still pass since the router hasn't changed
yet.

- [ ] **Step 3: Wire the claim into the router**

Modify `backend/app/routers/diagnostics.py`. Add the import (near the other
`..core` imports at the top):

```python
from ..core.email import send_diagnostic_notification_email, send_diagnostic_result_email
from ..core.idempotency import claim_turnstile_token
from ..core.limiter import limiter
```

Then in `submit_diagnostic`, right after the existing turnstile check:

Current:

```python
    remote_ip = request.client.host if request.client else None
    if not verify_turnstile_token(body.turnstile_token, remote_ip):
        raise HTTPException(
            status_code=400,
            detail="No se pudo verificar que eres humano, intenta de nuevo",
        )

    active_questions = (
```

New:

```python
    remote_ip = request.client.host if request.client else None
    if not verify_turnstile_token(body.turnstile_token, remote_ip):
        raise HTTPException(
            status_code=400,
            detail="No se pudo verificar que eres humano, intenta de nuevo",
        )

    if not claim_turnstile_token(db, body.turnstile_token):
        raise HTTPException(status_code=409, detail="Esta solicitud ya fue procesada")

    active_questions = (
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest app/tests/test_diagnostics_public.py -v`
Expected: PASS (all tests, including the new one)

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/diagnostics.py backend/app/tests/test_diagnostics_public.py
git commit -m "feat: reject duplicate turnstile token on diagnostic submit"
```

---

### Task 4: Wire the claim into `create_prospect`

**Files:**
- Modify: `backend/app/routers/prospects.py`
- Test: `backend/app/tests/test_prospects.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/app/tests/test_prospects.py`:

```python
def test_create_prospect_duplicate_token_rejected(client, monkeypatch):
    monkeypatch.setattr(
        "app.routers.prospects.verify_turnstile_token",
        lambda token, remote_ip=None: True,
    )
    first = client.post("/api/prospects/", json=VALID_PAYLOAD)
    assert first.status_code == 201

    second = client.post("/api/prospects/", json=VALID_PAYLOAD)
    assert second.status_code == 409
```

Also update `test_create_prospect_rate_limited` the same way as Task 3, for
the same reason (it currently reuses one token across 5 calls):

Current:

```python
def test_create_prospect_rate_limited(client, monkeypatch):
    monkeypatch.setattr(
        "app.routers.prospects.verify_turnstile_token",
        lambda token, remote_ip=None: True,
    )
    for _ in range(5):
        assert client.post("/api/prospects/", json=VALID_PAYLOAD).status_code == 201

    response = client.post("/api/prospects/", json=VALID_PAYLOAD)
    assert response.status_code == 429
```

New:

```python
def test_create_prospect_rate_limited(client, monkeypatch):
    monkeypatch.setattr(
        "app.routers.prospects.verify_turnstile_token",
        lambda token, remote_ip=None: True,
    )
    for i in range(5):
        payload = {**VALID_PAYLOAD, "turnstile_token": f"test-token-{i}"}
        assert client.post("/api/prospects/", json=payload).status_code == 201

    payload = {**VALID_PAYLOAD, "turnstile_token": "test-token-5"}
    response = client.post("/api/prospects/", json=payload)
    assert response.status_code == 429
```

- [ ] **Step 2: Run tests to verify the new one fails**

Run: `cd backend && python -m pytest app/tests/test_prospects.py -v`
Expected: `test_create_prospect_duplicate_token_rejected` FAILS (second call
returns 201, not 409).

- [ ] **Step 3: Wire the claim into the router**

Modify `backend/app/routers/prospects.py`. Add the import:

Current:

```python
from ..core.deps import get_db, get_current_admin
from ..core.limiter import limiter
from ..core.turnstile import verify_turnstile_token
from ..core.email import send_prospect_notification_email
```

New:

```python
from ..core.deps import get_db, get_current_admin
from ..core.idempotency import claim_turnstile_token
from ..core.limiter import limiter
from ..core.turnstile import verify_turnstile_token
from ..core.email import send_prospect_notification_email
```

Then in `create_prospect`, right after the existing turnstile check:

Current:

```python
    remote_ip = request.client.host if request.client else None
    if not verify_turnstile_token(body.turnstile_token, remote_ip):
        raise HTTPException(
            status_code=400,
            detail="No se pudo verificar que eres humano, intenta de nuevo",
        )

    prospect = Prospect(**body.model_dump(exclude={"turnstile_token"}))
```

New:

```python
    remote_ip = request.client.host if request.client else None
    if not verify_turnstile_token(body.turnstile_token, remote_ip):
        raise HTTPException(
            status_code=400,
            detail="No se pudo verificar que eres humano, intenta de nuevo",
        )

    if not claim_turnstile_token(db, body.turnstile_token):
        raise HTTPException(status_code=409, detail="Esta solicitud ya fue procesada")

    prospect = Prospect(**body.model_dump(exclude={"turnstile_token"}))
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest app/tests/test_prospects.py -v`
Expected: PASS (all tests, including the new one)

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/prospects.py backend/app/tests/test_prospects.py
git commit -m "feat: reject duplicate turnstile token on prospect submit"
```

---

### Task 5: Run the cleanup at startup

**Files:**
- Modify: `backend/app/main.py`

- [ ] **Step 1: Add the import and call**

Current (top of file and seed block):

```python
from .config import settings
from .core.diagnostic_seed import seed_diagnostic_questions
from .core.limiter import limiter
from .database import Base, SessionLocal, engine
from .routers import auth, diagnostics, leads, notifications, prospects, users
```

```python
_seed_db = SessionLocal()
try:
    seed_diagnostic_questions(_seed_db)
finally:
    _seed_db.close()
```

New:

```python
from .config import settings
from .core.diagnostic_seed import seed_diagnostic_questions
from .core.idempotency import cleanup_old_turnstile_tokens
from .core.limiter import limiter
from .database import Base, SessionLocal, engine
from .routers import auth, diagnostics, leads, notifications, prospects, users
```

```python
_seed_db = SessionLocal()
try:
    seed_diagnostic_questions(_seed_db)
    cleanup_old_turnstile_tokens(_seed_db)
finally:
    _seed_db.close()
```

- [ ] **Step 2: Run the full backend test suite to confirm nothing broke**

Run: `cd backend && python -m pytest -v`
Expected: PASS (all tests, including everything from Tasks 1-4)

- [ ] **Step 3: Commit**

```bash
git add backend/app/main.py
git commit -m "feat: clean up old used-turnstile-token rows at startup"
```

---

### Task 6: Frontend — `ContactForm` double-click guard + 409 message

**Files:**
- Modify: `frontend/src/components/Contact/ContactForm/index.tsx`

- [ ] **Step 1: Add the lock ref**

Current (`frontend/src/components/Contact/ContactForm/index.tsx:53-54`):

```tsx
    const turnstileContainerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
```

New:

```tsx
    const turnstileContainerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const submitLockRef = useRef(false);
```

- [ ] **Step 2: Guard the submit call and handle 409**

Current (`frontend/src/components/Contact/ContactForm/index.tsx:134-166`):

```tsx
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

New:

```tsx
        if (!turnstileToken) {
            setSubmitError(t("errorTurnstile"));
            return;
        }

        if (submitLockRef.current) return;
        submitLockRef.current = true;
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
            } else if (err instanceof ApiError && err.status === 409) {
                setSubmitError(t("errorDuplicate"));
            } else {
                setSubmitError(t("errorGeneric"));
            }
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.reset(widgetIdRef.current);
            }
            setTurnstileToken("");
        } finally {
            submitLockRef.current = false;
            setSubmitting(false);
        }
    };
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Contact/ContactForm/index.tsx
git commit -m "feat: guard ContactForm against duplicate submits"
```

---

### Task 7: Frontend — `DiagnosticGoModal` double-click guard + 409 message

**Files:**
- Modify: `frontend/src/components/Services/DiagnosticGo/Modal.tsx`

- [ ] **Step 1: Add the lock ref**

Current (`frontend/src/components/Services/DiagnosticGo/Modal.tsx:45-46`):

```tsx
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
```

New:

```tsx
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const submitLockRef = useRef(false);
```

- [ ] **Step 2: Guard the submit call and handle 409**

Current (`frontend/src/components/Services/DiagnosticGo/Modal.tsx:175-208`):

```tsx
    if (!turnstileToken) {
      setSubmitError(t("errorTurnstile"));
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    try {
      const submitResult = await submitDiagnostic({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        locale,
        answers,
        turnstile_token: turnstileToken,
      });
      setResult(submitResult);
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
  }
```

New:

```tsx
    if (!turnstileToken) {
      setSubmitError(t("errorTurnstile"));
      return;
    }

    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      const submitResult = await submitDiagnostic({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        locale,
        answers,
        turnstile_token: turnstileToken,
      });
      setResult(submitResult);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setSubmitError(t("errorRateLimited"));
      } else if (err instanceof ApiError && err.status === 400) {
        setSubmitError(t("errorTurnstile"));
      } else if (err instanceof ApiError && err.status === 409) {
        setSubmitError(t("errorDuplicate"));
      } else {
        setSubmitError(t("errorGeneric"));
      }
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
      setTurnstileToken("");
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  }
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Services/DiagnosticGo/Modal.tsx
git commit -m "feat: guard DiagnosticGoModal against duplicate submits"
```

---

### Task 8: Frontend — `errorDuplicate` translations

**Files:**
- Modify: `frontend/src/messages/es.json`
- Modify: `frontend/src/messages/en.json`
- Modify: `frontend/src/messages/fr.json`
- Modify: `frontend/src/messages/de.json`

Each file needs one new key added to the `diagnosticGo` block (right after
`errorRateLimited`) and one added to the `contactForm` block (right after
`errorRateLimited`).

- [ ] **Step 1: `es.json`**

`diagnosticGo` block — current:

```json
    "errorRateLimited": "Enviaste muchas solicitudes, intenta de nuevo más tarde",
    "errorGeneric": "Ocurrió un error, intenta de nuevo",
```

New:

```json
    "errorRateLimited": "Enviaste muchas solicitudes, intenta de nuevo más tarde",
    "errorDuplicate": "Ya recibimos tu diagnóstico, espera un momento",
    "errorGeneric": "Ocurrió un error, intenta de nuevo",
```

`contactForm` block — current:

```json
    "errorRateLimited": "Demasiados intentos. Intenta de nuevo más tarde.",
    "errorTurnstile": "No se pudo verificar que eres humano. Intenta de nuevo.",
```

New:

```json
    "errorRateLimited": "Demasiados intentos. Intenta de nuevo más tarde.",
    "errorDuplicate": "Ya recibimos tu mensaje, espera un momento antes de reintentar.",
    "errorTurnstile": "No se pudo verificar que eres humano. Intenta de nuevo.",
```

- [ ] **Step 2: `en.json`**

`diagnosticGo` block — current:

```json
    "errorRateLimited": "You've sent too many requests, try again later",
    "errorGeneric": "Something went wrong, please try again",
```

New:

```json
    "errorRateLimited": "You've sent too many requests, try again later",
    "errorDuplicate": "We already received your diagnostic, please wait a moment",
    "errorGeneric": "Something went wrong, please try again",
```

`contactForm` block — current:

```json
    "errorRateLimited": "Too many attempts. Please try again later.",
    "errorTurnstile": "We couldn't verify you're human. Please try again.",
```

New:

```json
    "errorRateLimited": "Too many attempts. Please try again later.",
    "errorDuplicate": "We already received your message. Please wait a moment before retrying.",
    "errorTurnstile": "We couldn't verify you're human. Please try again.",
```

- [ ] **Step 3: `fr.json`**

`diagnosticGo` block — current:

```json
    "errorRateLimited": "Vous avez envoyé trop de demandes, réessayez plus tard",
    "errorGeneric": "Une erreur s'est produite, veuillez réessayer",
```

New:

```json
    "errorRateLimited": "Vous avez envoyé trop de demandes, réessayez plus tard",
    "errorDuplicate": "Nous avons déjà reçu votre diagnostic, veuillez patienter un instant",
    "errorGeneric": "Une erreur s'est produite, veuillez réessayer",
```

`contactForm` block — current:

```json
    "errorRateLimited": "Trop de tentatives. Veuillez réessayer plus tard.",
    "errorTurnstile": "Nous n'avons pas pu vérifier que vous êtes humain. Veuillez réessayer.",
```

New:

```json
    "errorRateLimited": "Trop de tentatives. Veuillez réessayer plus tard.",
    "errorDuplicate": "Nous avons déjà reçu votre message. Veuillez patienter un instant avant de réessayer.",
    "errorTurnstile": "Nous n'avons pas pu vérifier que vous êtes humain. Veuillez réessayer.",
```

- [ ] **Step 4: `de.json`**

`diagnosticGo` block — current:

```json
    "errorRateLimited": "Du hast zu viele Anfragen gesendet, versuche es später erneut",
    "errorGeneric": "Etwas ist schiefgelaufen, bitte versuche es erneut",
```

New:

```json
    "errorRateLimited": "Du hast zu viele Anfragen gesendet, versuche es später erneut",
    "errorDuplicate": "Wir haben deine Diagnose bereits erhalten, bitte warte einen Moment",
    "errorGeneric": "Etwas ist schiefgelaufen, bitte versuche es erneut",
```

`contactForm` block — current:

```json
    "errorRateLimited": "Zu viele Versuche. Bitte versuchen Sie es später erneut.",
    "errorTurnstile": "Wir konnten nicht überprüfen, dass Sie ein Mensch sind. Bitte versuchen Sie es erneut.",
```

New:

```json
    "errorRateLimited": "Zu viele Versuche. Bitte versuchen Sie es später erneut.",
    "errorDuplicate": "Wir haben Ihre Nachricht bereits erhalten. Bitte warten Sie einen Moment, bevor Sie es erneut versuchen.",
    "errorTurnstile": "Wir konnten nicht überprüfen, dass Sie ein Mensch sind. Bitte versuchen Sie es erneut.",
```

- [ ] **Step 5: Verify the JSON is still valid**

Run: `cd frontend && node -e "['es','en','fr','de'].forEach(l => JSON.parse(require('fs').readFileSync('src/messages/'+l+'.json','utf8')))"`
Expected: no output, exit code 0 (throws and prints a `SyntaxError` if any file is malformed)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/messages/es.json frontend/src/messages/en.json frontend/src/messages/fr.json frontend/src/messages/de.json
git commit -m "feat: add errorDuplicate translations for both forms"
```

---

### Task 9: Manual verification

- [ ] **Step 1: Start the stack**

Run: `docker-compose -f docker-compose.dev.yml up --build` (or the project's
usual dev-run process)

- [ ] **Step 2: Backend — confirm the duplicate check works end-to-end**

With the backend running and a real `TURNSTILE_SECRET_KEY` configured (or
temporarily monkeypatched for a manual curl test), submit the same
`/api/prospects/` payload with the same `turnstile_token` twice in a row:
first response `201`, second response `409` with body
`{"detail": "Esta solicitud ya fue procesada"}`.

- [ ] **Step 3: Frontend — rapid double-click on Contáctanos**

Open the contact form, fill it out, resolve the Turnstile challenge, and
click "Enviar mensaje" twice as fast as possible. Confirm only one submit
happens (network tab shows a single POST, or the second click is a no-op)
and the success state renders normally.

- [ ] **Step 4: Frontend — rapid double-click on Diagnóstico GO**

Open the Diagnóstico GO modal, complete all steps, resolve the Turnstile
challenge, and click "Ver mi diagnóstico" twice as fast as possible.
Confirm only one submit happens and the result screen renders normally.

- [ ] **Step 5: Report results to the user**

Summarize what was tested and any deviations from expected behavior.
