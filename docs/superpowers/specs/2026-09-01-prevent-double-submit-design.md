# Prevent double-submit on Diagnóstico GO and Contáctanos

## Problem

Neither `POST /api/diagnostics/submit` nor `POST /api/prospects/` has any
idempotency protection. If the same user's request fires twice — a
double-click that outraces React's `disabled` state, or a browser/network
layer retry — the backend happily creates two DB rows, sends two emails,
and (for the diagnostic) makes two paid OpenRouter LLM calls, all while
consuming two of the five requests allowed per hour per IP.

This does not affect two different users submitting at the same time —
those requests are already independent and both complete normally. This is
specifically about a single user's request being duplicated.

## Design

### 1. Frontend — synchronous double-click guard

In `ContactForm` ([frontend/src/components/Contact/ContactForm/index.tsx](../../../frontend/src/components/Contact/ContactForm/index.tsx))
and `DiagnosticGoModal` ([frontend/src/components/Services/DiagnosticGo/Modal.tsx](../../../frontend/src/components/Services/DiagnosticGo/Modal.tsx)):

- Add `const submitLockRef = useRef(false)`.
- At the very top of `handleSubmit`, before validation: if
  `submitLockRef.current` is `true`, return immediately; otherwise set it to
  `true`.
- Reset `submitLockRef.current = false` in the existing `finally` block,
  alongside `setSubmitting(false)`.

A ref updates synchronously and doesn't depend on React re-rendering the
`disabled` attribute, so this closes the race regardless of render timing.

### 2. Backend — claim the Turnstile token as an idempotency key

Turnstile tokens are already required on both endpoints and are single-use
by Cloudflare's own design. Persisting "this token was claimed" in the
shared MySQL database (rather than in-memory) gives idempotency that holds
across the 2 uvicorn worker processes (`--workers 2` in
[backend/Dockerfile](../../../backend/Dockerfile)), and also protects
against a duplicate request that never goes through the React button at
all (network-level retry, direct API call).

- New model `UsedTurnstileToken` in
  `backend/app/models/used_turnstile_token.py`, table
  `used_turnstile_tokens`, following the existing style of
  [backend/app/models/notification_recipient.py](../../../backend/app/models/notification_recipient.py):
  - `token_hash` — `String(64)`, primary key, `sha256` hex digest of the
    raw token (avoids storing the raw token and keeps the key a fixed
    size).
  - `created_at` — `DateTime`, `server_default=func.now()`.
- New helper `backend/app/core/idempotency.py`:
  ```python
  def claim_turnstile_token(db: Session, token: str) -> bool:
      """Atomically claims a token. Returns False if already claimed."""
  ```
  Hashes the token, `db.add` + `db.commit()`; on `IntegrityError`,
  `db.rollback()` and return `False`; otherwise return `True`.
- In `submit_diagnostic`
  ([backend/app/routers/diagnostics.py](../../../backend/app/routers/diagnostics.py))
  and `create_prospect`
  ([backend/app/routers/prospects.py](../../../backend/app/routers/prospects.py)),
  call `claim_turnstile_token(db, body.turnstile_token)` immediately after
  `verify_turnstile_token` succeeds. If it returns `False`, raise
  `HTTPException(status_code=409, detail="Esta solicitud ya fue procesada")`.
  This happens **before** the OpenRouter call in the diagnostic flow and
  before either endpoint inserts its main record, so a caught duplicate
  never triggers a paid LLM call or a duplicate email.
- `Base.metadata.create_all(bind=engine)` (already called at startup in
  `backend/app/main.py`) creates the new table automatically — this
  project has no Alembic/migration tooling, new tables are picked up the
  same way `notification_recipients` etc. already are.
- Retention: given the existing `5/hour` per-IP rate limit and low expected
  traffic, no scheduled cleanup job is required for correctness. Add a
  one-time startup cleanup in `main.py` (same pattern as
  `seed_diagnostic_questions`) that deletes `used_turnstile_tokens` rows
  older than 30 days, to keep the table from growing unbounded over years.

### 3. Frontend — handle HTTP 409

- Add a new translation key `errorDuplicate` to the `diagnosticGo` and
  `contactForm` namespaces in all four locale files
  (`frontend/src/messages/{es,en,fr,de}.json`), e.g. es:
  `"Ya recibimos tu solicitud, espera un momento"`.
- In both `handleSubmit` catch blocks
  (alongside the existing `err.status === 429` / `=== 400` checks), add:
  `else if (err instanceof ApiError && err.status === 409) setSubmitError(t("errorDuplicate"));`
- Keep the existing Turnstile widget reset behavior on this path too (same
  as the other error branches), so the user has a clean way to retry if
  needed.

## Data flow

1. A user double-clicks submit, or a network layer retries the POST.
2. The frontend ref guard stops most of these before a second request is
   even sent.
3. If two requests still reach the backend (direct API call, or the guard
   is bypassed some other way): both would carry the same Turnstile token
   in the common case. `claim_turnstile_token`'s DB-level unique constraint
   makes exactly one request win the race atomically, across both uvicorn
   worker processes. The loser gets `409` immediately, without hitting
   OpenRouter or writing a duplicate row.

## Testing

- Backend: a pytest test (following the existing pattern in
  `backend/app/tests/test_diagnostics_public.py`) that submits the same
  `turnstile_token` twice for `/api/diagnostics/submit` and once for
  `/api/prospects/`, asserting the second call returns `409`, only one row
  exists in the corresponding table, and the mocked OpenRouter call
  happened at most once for the diagnostic case.
- Frontend: no test infrastructure exists for these components; the
  ref-guard and 409-message changes are verified manually in the browser
  (rapid double-click on both forms, and a forced duplicate via devtools).

## Out of scope

- Deduplicating on submission *content* (e.g. same email + same answers)
  rather than the Turnstile token — the token is a simpler, already-unique
  key and covers the actual failure mode described.
- Any change to the `5/hour` per-IP rate limiting, which already handles
  the different-users-at-the-same-time case correctly and is unrelated to
  this bug.
