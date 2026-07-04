# Contact form → email notification to configurable recipient list

## Context

The contact form already saves submissions to the `prospects` table
(`POST /api/prospects/`, see `2026-07-04-contact-form-prospects-design.md`). There is no
notification when a new prospect comes in — the team only finds out by checking the
dashboard.

The team's existing mailbox is Zoho, but Zoho's plan caps mailboxes at 5 and the team
doesn't want to touch that mailbox's configuration or reputation for automated sending.
Sending was also considered directly from the VPS, but a fresh VPS IP has no sending
reputation and no SPF/DKIM/PTR set up, so mail would likely be spam-filtered or rejected —
not used.

Domain: `lyratech.com.mx`, DNS is accessible to the user.

## Goals

1. When a prospect submits the contact form, an HTML email is sent notifying the team.
2. The list of recipient email addresses is configurable from the dashboard (Settings),
   not hardcoded — anyone can be added/removed without a deploy.
3. Sending goes through Resend (transactional email API), using a dedicated subdomain
   (`notificaciones.lyratech.com.mx`) so its SPF/DKIM setup is fully isolated from the
   root domain's existing Zoho MX/SPF records — zero risk to the Zoho mailbox.
4. Replying to the notification email goes to the prospect's own email (Reply-To), not
   back to the sending address.
5. A failed/slow email send never blocks or fails the prospect's form submission.

## Non-goals

- No email digest/batching — one email per submission.
- No per-recipient preferences (e.g. only notify for certain `service` values).
- No retry/queue system for failed sends — a failure is logged and dropped.
- No changes to the existing `prospects` or `leads` tables/flows beyond adding the
  notification dispatch.

## Backend

### Model — `app/models/notification_recipient.py`

New SQLAlchemy model `NotificationRecipient`: `id, email (unique), created_at`.

### Schemas — `app/schemas/notification_recipient.py`

- `NotificationRecipientCreate`: `email: EmailStr`.
- `NotificationRecipientResponse`: `id, email, created_at` (`from_attributes = True`).

### Router — `app/routers/notifications.py`

All protected via `get_current_user` (dashboard-only, same as `leads`):

- `GET /api/notifications/recipients` — list all, ordered by `created_at`.
- `POST /api/notifications/recipients` — create; `409` if the email already exists.
- `DELETE /api/notifications/recipients/{id}` — remove; `404` if not found.

### Email sending — `app/core/email.py`

New module, same style as `app/core/turnstile.py`:

- `build_prospect_notification_html(prospect: Prospect) -> str` — renders a simple styled
  HTML template (inline CSS, Lyratech brand colors) showing name, email, phone, company,
  service, message, and (if `settings.FRONTEND_URL` is set) a link to
  `{FRONTEND_URL}/dashboard/prospects`.
- `send_prospect_notification_email(prospect: Prospect, recipient_emails: list[str]) -> None`
  — POSTs to `https://api.resend.com/emails` via `httpx` (already a dependency — no need
  for the `resend` SDK package) with:
  - `Authorization: Bearer {settings.RESEND_API_KEY}`
  - body: `from`, `to` (the recipient list), `reply_to` (prospect's email), `subject`
    (`"Nuevo prospecto: {name}"`), `html`.
  - Wrapped in try/except: log via `logging` on any failure (HTTP error, timeout,
    misconfiguration) and return without raising. If `recipient_emails` is empty, log and
    return without calling the API.

### Wiring into `app/routers/prospects.py`

`create_prospect` gains a `background_tasks: BackgroundTasks` parameter. After the
existing commit/refresh, query `NotificationRecipient` for all emails (cheap, same DB
session, still inside the request) and dispatch
`background_tasks.add_task(send_prospect_notification_email, prospect, recipient_emails)`
— so the network call to Resend happens after the response is already sent to the
prospect, and any failure there can't affect the `201` response.

### Config — `app/config.py`

Add:
- `RESEND_API_KEY: str = ""`
- `NOTIFICATION_FROM_EMAIL: str = "notificaciones@lyratech.com.mx"`
- `NOTIFICATION_FROM_NAME: str = "Lyratech"`
- `FRONTEND_URL: str = ""` (optional; only used to build the dashboard link in the email)

### `app/main.py`

Register `notifications.router` under `/api`, same pattern as `leads`/`prospects`.

### Database — `backend/database/init.sql`

Add `CREATE TABLE IF NOT EXISTS notification_recipients (id, email UNIQUE, created_at)`,
same additive pattern used for `prospects`.

## Frontend

### `lib/api.ts`

Add `notificationsApi.list()`, `.create(email)`, `.remove(id)` — authenticated, using the
existing shared `request()` helper (unlike `submitProspect`, these are dashboard-only
calls and should carry the auth header like `leadsApi`/`prospectsApi.list`).

### Settings page — `app/dashboard/(protected)/settings/page.tsx`

Add a third tab, **"Notificaciones"** (icon e.g. `HiOutlineMail`), alongside "Mi cuenta"/
"Seguridad". Content: a list of configured recipient emails (each row with the email and
a remove button) plus a small form (email input + "Agregar" button) to add a new one.
Same visual pattern as the other tabs (`bg-white rounded-2xl shadow-sm border p-6`,
`inputClass`, ok/err message block).

## External prerequisites (user-provided, not implemented here)

- A Resend account (free tier).
- In Resend, add and verify the domain `notificaciones.lyratech.com.mx`. Resend provides
  SPF (TXT) and DKIM (CNAME/TXT) records to add at the DNS provider for that subdomain
  only — this does not touch any existing `lyratech.com.mx` root-domain records (Zoho's
  MX/SPF/DKIM stay untouched).
- Generate a Resend API key → `RESEND_API_KEY` in `backend/.env`.
- Set `NOTIFICATION_FROM_EMAIL` (e.g. `notificaciones@lyratech.com.mx`) once the
  subdomain is verified.
- Optionally set `FRONTEND_URL` (e.g. `https://lyratech.com.mx`) for the dashboard link.

## Error handling

- Email send failure (Resend API error, timeout, missing API key) → logged, swallowed;
  prospect creation still returns `201` as today.
- No recipients configured → logged, no API call made, prospect creation unaffected.
- Duplicate recipient email → `409` from `POST /api/notifications/recipients`, surfaced
  as an inline error in the Settings tab.

## Testing

- Backend: unit tests for `notifications.py` router (401 without auth token; create/list/
  delete happy path; 409 on duplicate email) — same test style as `test_prospects.py`.
  Unit test for `create_prospect` mocking `send_prospect_notification_email` (or the
  underlying `httpx` call) to confirm: (a) it's invoked with the right recipients when
  configured, (b) an exception from it never surfaces as a failed `201` response.
- Frontend: manual verification via dev server — add/remove emails in
  Settings → Notificaciones, then submit the real contact form and confirm the
  configured address(es) receive the styled email with the correct Reply-To.
