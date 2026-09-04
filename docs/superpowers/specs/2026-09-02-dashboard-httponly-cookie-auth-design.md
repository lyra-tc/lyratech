# Dashboard auth: httpOnly cookie + server-side route gate

**Date:** 2026-09-02
**Branch:** `fix/RSR_no-ref_dashboard-auth-flash-before-login-redirect`
**Status:** Approved, ready for implementation plan

## Problem

Two related defects in the dashboard auth flow:

1. **UX bug (already partially fixed on this branch).** The dashboard renders before
   the auth check runs, so users see a flash of the dashboard before being bounced
   to `/dashboard/login`:
   - Users who never signed in: full shell + child pages paint, child pages fire
     API calls, then a client-side `router.push` to login.
   - Users with an expired session: the token string is still in `localStorage`
     (expiry lives in the JWT), the stale cached user renders the full dashboard,
     then `auth.me()` 401s and does a hard `window.location.href` redirect.

   A render gate was added to `frontend/src/app/dashboard/(protected)/layout.tsx`
   that shows a full-screen loader until `auth.me()` confirms the session. This
   spec supersedes that interim fix and folds it into the final design.

2. **Security weakness.** The access token lives in `localStorage`, so any XSS on
   the dashboard origin can exfiltrate a valid session token. There is no
   server-side protection of `/dashboard/*` routes at all — protection is 100%
   client-side.

## Goal

- Access token stored in an `httpOnly` cookie, never readable by JavaScript.
- `/dashboard/*` gated server-side (Next middleware) so unauthenticated requests
  never receive dashboard HTML — no flash, no spinner in the common case.
- Nothing that currently works breaks: the existing backend test suite (15 tests
  using `Authorization: Bearer`), `/api/docs` manual auth, the public endpoints
  (prospects / diagnostics submit), and i18n routing for the marketing site.

## Non-goals

- CSRF tokens / double-submit cookies (see "CSRF" below for why the design is
  safe without them; noted as future hardening).
- Refresh tokens / sliding sessions. Token lifetime stays 480 min, same as today.
- Deleting the dead `components/Dashboard/Sidebar.tsx` (out of scope; noted).
- Migrating the public `fetch` calls (`submitProspect`, `getActiveDiagnosticQuestions`,
  `submitDiagnostic`) — they stay credential-less.

## Approach

**httpOnly cookie + dual-read backend + presence-check middleware.**

The backend keeps accepting `Authorization: Bearer` (for `/api/docs` and the
existing tests) *and* additionally sets/reads an `httpOnly` cookie. The frontend
stops touching `localStorage` and sends `credentials: "include"`. Next middleware
blocks `/dashboard/*` server-side on cookie presence. The protected layout keeps a
loader-gate only for the "cookie present but expired/invalid" case.

Alternatives rejected:
- **Cookie-only backend (no Bearer):** breaks the 15 header-based tests and
  `/api/docs` login.
- **Keep `localStorage` + non-httpOnly companion cookie for the gate:** zero
  security gain (token still XSS-exposed); the point of this work is the hardening.

## Cookie attributes

| Attribute | Prod | Dev | Local |
|---|---|---|---|
| Name | `lyratech_session` | `lyratech_session_dev` | `lyratech_session` |
| `Domain` | `.lyratech.com.mx` | `.lyratech.com.mx` | *(unset — host-only)* |
| `Secure` | `true` | `true` | `false` |
| `HttpOnly` | `true` | `true` | `true` |
| `SameSite` | `Lax` | `Lax` | `Lax` |
| `Max-Age` | `JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60` | same | same |
| `Path` | `/` | `/` | `/` |

- `SameSite=Lax` is sufficient because the frontend (`lyratech.com.mx` /
  `dev.lyratech.com.mx`) and API (`api.lyratech.com.mx` /
  `dev-api.lyratech.com.mx`) share the registrable domain `lyratech.com.mx`, so
  XHR between them is same-site.
- Dev and prod both need `Domain=.lyratech.com.mx` (their API subdomain is a
  sibling, not a child, of the frontend subdomain — common parent is
  `lyratech.com.mx`). Distinct cookie **names** keep dev from clobbering prod in a
  browser logged into both.
- `Secure` is **derived**, not a separate env var: `secure = bool(AUTH_COOKIE_DOMAIN)`.

## New environment variables (2)

Per-server `.env`:

```bash
# Prod
AUTH_COOKIE_NAME=lyratech_session
AUTH_COOKIE_DOMAIN=.lyratech.com.mx

# Dev
AUTH_COOKIE_NAME=lyratech_session_dev
AUTH_COOKIE_DOMAIN=.lyratech.com.mx

# Local: unset — defaults apply (name=lyratech_session, domain="", secure=false)
```

Wiring:
- `backend` service `environment:` gets `AUTH_COOKIE_NAME` and `AUTH_COOKIE_DOMAIN`
  (both `docker-compose.yml` and `docker-compose.dev.yml`).
- `frontend` service `build.args:` gets `NEXT_PUBLIC_AUTH_COOKIE_NAME: ${AUTH_COOKIE_NAME:-lyratech_session}`
  — the Next middleware needs the name, and this repo passes all frontend config
  as build args.
- `frontend/Dockerfile`: add `ARG NEXT_PUBLIC_AUTH_COOKIE_NAME` + `ENV` line
  alongside the existing `NEXT_PUBLIC_*` args.
- `.env.example`: document both new vars.

The frontend `Domain`/`Secure` never appear in frontend config — only the backend
sets the cookie; the frontend only reads its name.

## Backend changes

### `app/config.py`
- `AUTH_COOKIE_NAME: str = "lyratech_session"`
- `AUTH_COOKIE_DOMAIN: str = ""`
- property `auth_cookie_secure` → `bool(self.AUTH_COOKIE_DOMAIN)`

### `app/core/cookies.py` (new)
- `set_session_cookie(response: Response, token: str) -> None` — calls
  `response.set_cookie` with the attributes from the table above, `max_age` from
  `settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60`, `domain=settings.AUTH_COOKIE_DOMAIN or None`.
- `clear_session_cookie(response: Response) -> None` — `response.delete_cookie`
  with matching `key`, `domain`, `path="/"`.

### `app/routers/auth.py`
- `POST /api/auth/login`: add `response: Response` param; after building the token,
  call `set_session_cookie(response, token)`. Still returns `{access_token, token_type}`
  in the body (unchanged — keeps `Token` schema and tests valid).
- `POST /api/auth/logout` (new): status `204`, no auth dependency, calls
  `clear_session_cookie(response)`. Idempotent.

### `app/core/deps.py`
- Replace `bearer_scheme = HTTPBearer()` with
  `optional_bearer = HTTPBearer(auto_error=False)`.
- `get_current_user` signature adds `request: Request` and
  `credentials: HTTPAuthorizationCredentials | None = Depends(optional_bearer)`.
- Token resolution: `token = request.cookies.get(settings.AUTH_COOKIE_NAME)`;
  if `None` and `credentials is not None`, `token = credentials.credentials`;
  if still falsy → raise the existing `401` `HTTPException` (today an unauthenticated
  request gets `403` from `HTTPBearer`; this becomes `401`).
- The rest (decode, `sub`/`iat` presence, `JWTError` handling, user lookup,
  `is_active`, `password_changed_at` staleness) is unchanged.
- `get_current_admin` unchanged.

### CSRF analysis (no code change)

Safe without CSRF tokens because:
- `SameSite=Lax` — the cookie is not sent on cross-site `POST`/`PUT`/`PATCH`/`DELETE`
  (fetch or form). It is sent on cross-site top-level GET navigation, but the API
  has no state-changing GETs.
- CORS `allow_origins` is an explicit allowlist (never `*`), with
  `allow_credentials=True`. A disallowed origin's browser JS cannot read responses
  or make preflighted requests.
- All mutations require `Content-Type: application/json`, which forces a CORS
  preflight cross-site — blocked for non-allowlisted origins.

Documented as future hardening if the API ever serves clients beyond this frontend.

## Frontend changes

### `src/lib/api.ts`
- `request()`: add `credentials: "include"` to the `fetch` call.
- Remove `getToken()` and the `Authorization` header block.
- Remove `getCachedUser()` and the `UserInfo` cache; remove all `localStorage`
  reads/writes of `lyratech_token` and `lyratech_user`.
- On `401` without `skipAuthRedirect`: `window.location.href = "/dashboard/login"`
  (kept — covers mid-session expiry during an API call).
- Add `auth.logout: () => request<void>("/api/auth/logout", { method: "POST", skipAuthRedirect: true })`.
- `auth.me` keeps the optional `{ skipAuthRedirect?: boolean }` arg added on this branch.

### `src/middleware.ts`
- Compose with the `next-intl` middleware instead of being only that.
- `const COOKIE = process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME || "lyratech_session"`.
- For `pathname.startsWith("/dashboard")`:
  - public dashboard paths = `/dashboard/login`, `/dashboard/register` (exact or `+ "/"` prefix).
  - no cookie + not public → `NextResponse.redirect` to `/dashboard/login`.
  - has cookie + public → `NextResponse.redirect` to `/dashboard/leads`.
  - otherwise `NextResponse.next()`.
- Non-dashboard paths → delegate to the `next-intl` middleware (unchanged behavior).
- `matcher` changes from `["/", "/((?!api|static|.*\\..*|_next|dashboard).*)"]`
  to `["/", "/((?!api|static|.*\\..*|_next).*)"]` (stop excluding `dashboard`).

### `src/app/dashboard/(protected)/layout.tsx`
- Keep the `status: "checking" | "authenticated" | "unauthenticated"` gate and
  `FullScreenLoader` added on this branch.
- Remove the `localStorage.getItem("lyratech_token")` synchronous branch (the
  middleware now guarantees a cookie is present before this renders).
- Effect just calls `auth.me({ skipAuthRedirect: true })`: success → cache-free
  `setUser` + `authenticated`; failure → `unauthenticated` + `router.replace("/dashboard/login")`.
- Render `<DashboardShell user={user}>` only when `authenticated && user`.

### `src/app/dashboard/login/page.tsx`
- Remove the `useEffect` that checks `localStorage` and redirects (middleware does
  this now).
- `handleSubmit`: `await auth.login(email, password)` (cookie set via `Set-Cookie`),
  then `router.push("/dashboard/leads")`. Drop the `auth.me()` call and the
  `localStorage` writes.

### `src/app/dashboard/register/page.tsx`
- Remove the `useEffect` that checks `localStorage` and redirects.

### `src/components/Dashboard/DashboardShell.tsx`
- `handleLogout`: `try { await auth.logout(); } catch {}` then
  `router.replace("/dashboard/login")`. Remove `localStorage` removals.

### `src/app/dashboard/(protected)/settings/page.tsx`
- Remove the `localStorage.setItem("lyratech_user", ...)` write (no cache anymore).
  Profile-name change in the sidebar already only reflected after a full reload
  (the protected layout does not remount on in-dashboard navigation); behavior is
  unchanged — a full reload re-fetches via `auth.me()`.

## Testing

### Backend (pytest — `backend/app/tests/`)
New cases in a new file `backend/app/tests/test_auth_cookie.py`:
1. `POST /api/auth/login` response has a `Set-Cookie` for `AUTH_COOKIE_NAME` with
   `HttpOnly`; `httponly` flag present.
2. `GET /api/auth/me` succeeds with only the cookie in the jar (no `Authorization`
   header).
3. `POST /api/auth/logout` returns `204` and emits a `Set-Cookie` that expires the
   cookie.
4. `GET /api/auth/me` with neither cookie nor header → `401` (regression guard for
   the `403`→`401` change).
5. `GET /api/auth/me` with an invalid cookie value → `401`.

Regression: the full existing suite must stay green (Bearer header path unchanged).
`conftest.py`'s `auth_client` / `non_admin_client` override `get_current_user`
wholesale, so the signature change does not affect them.

### Frontend (no test infra)
Manual verification checklist, documented in the plan:
1. No session, navigate straight to `/dashboard/leads` → served `/dashboard/login`,
   no dashboard paint (check Network: no dashboard data requests).
2. Log in → `/dashboard/leads` renders; DevTools → Application → Cookies shows an
   `httpOnly` `lyratech_session` cookie; `localStorage` is empty.
3. Delete/alter the cookie, reload → brief loader → `/dashboard/login`.
4. Log out → `/dashboard/login`; browser "back" does not return to the dashboard.
5. `/api/docs` → "Authorize" with a Bearer token still works.
6. Marketing site i18n routes (`/nosotros`, `/servicios`, locale detection) still work.

## Deploy sequence

1. Add `AUTH_COOKIE_NAME` + `AUTH_COOKIE_DOMAIN` to the prod and dev server `.env`
   files **before** deploying (values per the table above).
2. Merge to `main` (prod) / `develop` (dev). The existing workflow runs
   `git pull` + `docker compose build backend frontend` + `up -d --force-recreate`.
3. All active dashboard sessions end once (expected, accepted). The orphaned
   `localStorage.lyratech_token` on clients is inert and can be ignored.

## Implementation notes (deviations from the draft above)

- **Middleware does NOT redirect a cookie-bearing request away from `/dashboard/login`.**
  An expired cookie still physically exists in the browser; if the middleware
  bounced it to `/dashboard/leads`, the protected layout's `auth.me()` would 401
  and bounce it back — an infinite loop. Middleware only redirects *missing*-cookie
  requests to login. "Already logged in → skip the form" is instead handled by the
  login page calling `auth.me()` on mount and `router.replace`-ing to
  `/dashboard/leads` only on success.
- **The protected layout calls `auth.logout()` in its `auth.me()` catch** before
  redirecting, so a stale cookie is cleared and the middleware stops seeing the
  browser as "has a session" on the next navigation.

## Risks

- **Next middleware reading a non-`NEXT_PUBLIC_` runtime env:** avoided by passing
  the name as a `NEXT_PUBLIC_` build arg (baked per-environment at build time,
  consistent with the repo's existing frontend config pattern).
- **Dev cookie clobbering prod** in a browser logged into both: mitigated by
  distinct names. If `NEXT_PUBLIC_AUTH_COOKIE_NAME` is somehow unset at build, both
  fall back to `lyratech_session` — degrades to the annoying-for-developer-only
  case, never a security issue.
- **`SameSite=Lax` + a future API consumer on a different site:** would need
  `SameSite=None` + explicit CSRF protection. Out of scope; flagged.
