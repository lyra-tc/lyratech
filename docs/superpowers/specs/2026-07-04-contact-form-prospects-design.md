# Contact form → prospects table → dashboard section

## Context

The public contact form (`ContactForm` component, on the `/contact` page) currently only
does client-side validation and shows a fake success state (`// TODO: Connect to API`).
The `leads` table/model/router/dashboard page already exist and are fully built (CRUD,
auth-protected, used for sales pipeline management by the team).

Separately, a `prospects` table already exists in the dev database (created directly on
the server, not represented anywhere in code):

```sql
CREATE TABLE prospects (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  company VARCHAR(255),
  service VARCHAR(100),
  message TEXT,
  created_at DATETIME DEFAULT (now()),
  PRIMARY KEY (id),
  KEY ix_prospects_id (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

Its columns match the contact form fields exactly (`name, email, phone, company, service,
message`). This is the intended storage target for form submissions — separate from
`leads`, which is the sales team's working pipeline. This spec wires the form to this
table end-to-end and adds a dashboard section to view/manage the results.

## Goals

1. Contact form submissions are persisted to the `prospects` table.
2. The submission endpoint is public (no login) but protected against spam/abuse.
3. Dashboard gets a new "Prospectos" section to view submissions and optionally promote
   one into a `lead`.

## Non-goals

- No changes to the existing `leads` CRUD/model/schema.
- No edit capability for prospects (they are raw submissions, not a pipeline entity).
- No automated deletion/archival policy for prospects.

## Backend

### Model — `app/models/prospect.py`

New SQLAlchemy model `Prospect`, mapped to the existing `prospects` table:
`id, name, email, phone, company, service, message, created_at`. No `updated_at`, no
`status`, no `assigned_to` — intentionally simpler than `Lead`.

### Schemas — `app/schemas/prospect.py`

- `ProspectCreate`: `name: str`, `email: str`, `phone: Optional[str]`,
  `company: Optional[str]`, `service: Optional[str]`, `message: Optional[str]`,
  `turnstile_token: str`. The token is required for validation only; it is never
  persisted.
- `ProspectResponse`: all `Prospect` columns (`from_attributes = True`), no
  `turnstile_token`.

### Router — `app/routers/prospects.py`

- `POST /api/prospects/` — **public**, no `Depends(get_current_user)`.
  1. Rate limit by IP via `slowapi`: `5/hour` on this route.
  2. Server-side verification: POST `turnstile_token` + `TURNSTILE_SECRET_KEY` to
     `https://challenges.cloudflare.com/turnstile/v0/siteverify`. If `success` is not
     `true`, return `400` with a generic error message.
  3. On success, create and commit the `Prospect` row (excluding `turnstile_token`),
     return `201` with `ProspectResponse`.
- `GET /api/prospects/` — protected (`get_current_user`), same pagination pattern as
  `leads.list_leads` (`skip`, `limit`, ordered by `created_at desc`).
- `DELETE /api/prospects/{id}` — protected, for removing spam that passed verification.

### Config — `app/config.py`

Add `TURNSTILE_SECRET_KEY: str = ""` to `Settings`. Value supplied via `backend/.env`
(both dev and prod), created by the user in the Cloudflare Turnstile dashboard — this is
an external prerequisite, not something implemented in code.

### Dependencies — `requirements.txt`

Add `slowapi` (rate limiting) and an HTTP client for the server-side Turnstile
verification call (reuse `httpx` if already transitively available, otherwise add it
explicitly).

### `app/main.py`

- Register `prospects.router` under `/api`, same pattern as `leads`.
- Initialize the `slowapi` `Limiter` (keyed by remote IP) and its exception handler.

### Database migration — `backend/database/init.sql`

Add the `CREATE TABLE IF NOT EXISTS prospects (...)` DDL (matching what's already on the
dev server, shown above) so fresh environments (new Docker dev DB, prod DB init) get the
table too. This is additive only — does not touch `users` or `leads`.

## Frontend

### `lib/api.ts`

- `Prospect` interface: `id, name, email, phone, company, service, message, created_at`.
- `prospectsApi.list()` — authenticated, for the dashboard.
- `prospectsApi.remove(id)` — authenticated.
- `submitProspect(data)` — a standalone function (not using the shared `request()`
  helper's auth-header injection, since this call must work for anonymous site visitors)
  that POSTs to `/api/prospects/` and surfaces the backend's error message on failure
  (e.g. rate-limited, Turnstile failed).

### `components/Contact/ContactForm/index.tsx`

- Add the Cloudflare Turnstile widget (visible checkbox widget, not invisible) below the
  message field, using `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Store the resulting token in
  component state.
- `handleSubmit` becomes `async`. After client-side field validation passes:
  block submission if no Turnstile token yet (show inline error); otherwise call
  `submitProspect(...)` mapping `service` → `service`, `message` → `message` directly
  (no repurposing of unrelated columns, since `prospects` has dedicated columns for
  both).
- On success: keep the existing success UI state.
- On failure: new error state (the component currently has no failure path) — show an
  inline error message above the submit button, in the same visual style as
  `dashboard/leads`'s `formError` block, and re-enable the form for retry.

### `app/dashboard/prospects/page.tsx` (new)

Same visual/structural pattern as `app/dashboard/leads/page.tsx`:

- Table columns: Nombre, Empresa, Contacto (email/phone), Servicio, Mensaje (truncated),
  Fecha.
- Search by name/email/company (client-side filter, same pattern as leads page).
- Row actions: **Convertir a lead** and **Eliminar**.
  - "Convertir a lead" opens the existing Nuevo Lead modal (reusing its component/logic
    from the leads page — extract if needed for shared use, or duplicate minimally if
    extraction is disproportionate) pre-filled with `name/email/phone/company`,
    `source = "Web"`, `notes` seeded from the prospect's `service` + `message`. Saving
    creates a lead via `leadsApi.create`; the source prospect row is left untouched (not
    auto-deleted), so the original submission stays intact.
  - "Eliminar" removes the prospect (for spam cleanup), same confirm-dialog pattern as
    leads.
- No create/edit modal for prospects themselves — they are read-only submissions.

### `components/Dashboard/DashboardShell.tsx`

Add a `"Prospectos"` entry to `NAV_ITEMS`, pointing to `/dashboard/prospects`, using an
inbox-style icon (e.g. `HiOutlineInboxIn`).

## External prerequisites (user-provided, not implemented here)

- A Cloudflare Turnstile site must be created by the user at
  dash.cloudflare.com → Turnstile. This yields:
  - A **site key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (frontend `.env.local`)
  - A **secret key** → `TURNSTILE_SECRET_KEY` (backend `.env`)
  Without these, the contact form cannot be submitted (Turnstile verification will
  always fail).

## Error handling

- Rate limit exceeded → `429` from `slowapi`, surfaced as a friendly inline message in
  the form ("Demasiados intentos, intenta de nuevo más tarde").
- Turnstile verification failure → `400`, generic message ("No se pudo verificar que
  eres humano, intenta de nuevo").
- Network/server errors → generic fallback error message, same as existing dashboard
  error-handling pattern.

## Testing

- Backend: unit test for `POST /api/prospects/` covering (a) success path with mocked
  Turnstile verification, (b) Turnstile failure → 400, (c) rate-limit trip → 429.
  Unit test for `GET`/`DELETE` requiring auth (401 without token).
- Frontend: manual verification via dev server — submit the contact form end-to-end
  (with a real or Cloudflare-provided test sitekey/secret for local dev), confirm the
  row appears in `/dashboard/prospects`, confirm "Convertir a lead" pre-fills and creates
  a row in `/dashboard/leads`.
