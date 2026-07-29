# Lyratech

Monorepo del sitio web publico y dashboard interno de Lyratech.

Incluye:
- `frontend/`: sitio multi-idioma en Next.js + dashboard `/dashboard`.
- `backend/`: API REST en FastAPI.
- `backend/database/init.sql`: esquema inicial de MySQL.

## Stack

- Frontend: Next.js 15, React 18, TypeScript, Tailwind CSS, `next-intl` 4, Framer Motion.
- Backend: FastAPI, SQLAlchemy 2, Pydantic 2, PyMySQL, PyJWT, bcrypt, slowapi (rate limiting).
- Integraciones: Cloudflare Turnstile, OpenRouter, Resend.
- Base de datos: MySQL 8.

## Funcionalidad actual

### Sitio publico

- Rutas localizadas en `frontend/src/app/[locale]`.
- Idiomas soportados: `es`, `en`, `fr`, `de`.
- Formularios publicos de contacto/prospects protegidos con Turnstile.
- Flujo `Diagnostic GO` con preguntas dinamicas, scoring y resultado enriquecido por LLM.

### Dashboard

- Login, registro y perfil (cualquier usuario activo).
- Gestion de `Leads` — solo admin.
- Gestion de `Prospects` (ver/borrar) — solo admin. El alta viene del formulario publico.
- Gestion de `Notifications` (destinatarios) — solo admin.
- Gestion de `Diagnosticos` enviados (ver/borrar) — solo admin.
- Gestion de `Preguntas` del diagnostico, incluyendo reorder — solo admin.
- Gestion de `Users` — solo admin.

### Usuarios y permisos

- El primer usuario registrado queda `activo + admin` automaticamente (bootstrap inicial).
- Cualquier otro registro nuevo queda `pendiente` (`is_active = false`) hasta que un admin lo active desde `/dashboard/users`.
- `is_superadmin` no se otorga por ningun flujo automatico ni por nombre — solo se asigna manualmente en la base de datos. Es una salvaguarda extra: la cuenta `superadmin` no puede ser editada, desactivada ni eliminada desde el dashboard (ni por otros admins).
- Solo un `superadmin` puede quitar `admin` a otro admin normal.
- Todos los endpoints de datos de negocio (`leads`, `prospects`, `notifications`, `diagnostics` admin) requieren `is_admin`; un usuario activo pero no-admin solo puede usar su propio perfil (`/auth/me`, cambio de contrasena).

## Seguridad

- HTTPS + HSTS en produccion; headers `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy` (backend, `app/main.py`) y equivalentes en el frontend (`next.config.ts`).
- Auth por JWT Bearer en header, sin cookies de sesion (CSRF clasico no aplica a esta arquitectura).
- Contrasenas con `bcrypt`; minimo 6 caracteres al registrar y al cambiar contrasena.
- Rate limiting por IP (`slowapi`): login `5/minuto`, registro `5/hora`, formulario de contacto y envio de diagnostico `5/hora` cada uno.
- CORS restringido a los origenes del frontend (`BACKEND_CORS_ORIGINS`), no wildcard.
- Logging de eventos de seguridad (login fallido/exitoso, registro, cambios de rol, borrado de cuentas, reset de contrasena por admin) via logger `security`.
- Sin SQL crudo: todo el acceso a datos pasa por SQLAlchemy ORM parametrizado.

## Estructura del repo

```text
lyratech/
|-- backend/
|   |-- app/
|   |   |-- core/
|   |   |-- models/
|   |   |-- routers/
|   |   |-- schemas/
|   |   `-- main.py
|   |-- database/
|   |   `-- init.sql
|   |-- requirements.txt
|   `-- Dockerfile
|-- frontend/
|   |-- src/
|   |   |-- app/
|   |   |-- components/
|   |   |-- lib/
|   |   `-- messages/
|   |-- package.json
|   `-- Dockerfile
|-- docker-compose.dev.yml
|-- docker-compose.yml
`-- .env.example
```

## Base de datos

`backend/database/init.sql` define estas tablas:

- `users`
- `leads`
- `prospects`
- `notification_recipients`
- `diagnostic_questions`
- `diagnostic_submissions`

Notas:

- `users.is_admin` inicia en `FALSE` por defecto (excepto el primer usuario registrado, ver "Usuarios y permisos").
- `users.is_superadmin` inicia en `FALSE` por defecto y solo se asigna manualmente en la base de datos, nunca por la API.
- El backend hace un ajuste de esquema al arrancar (`ensure_user_management_schema` en `app/main.py`) para agregar columnas nuevas en instalaciones existentes que vengan de una version anterior de `init.sql`.

## API

Base local esperada:

- Backend directo: `http://localhost:8000`
- Docker dev: `http://localhost:8001`

Niveles de acceso: **publico** (sin token), **auth** (cualquier usuario activo), **admin** (`is_admin`).

### Auth

- `POST /api/auth/register` — publico, `5/hora` por IP
- `POST /api/auth/login` — publico, `5/minuto` por IP
- `GET /api/auth/me` — auth
- `PUT /api/auth/me` — auth
- `PUT /api/auth/change-password` — auth

### Users

- `GET /api/users/` — admin
- `PATCH /api/users/{user_id}` — admin
- `PUT /api/users/{user_id}/reset-password` — admin
- `DELETE /api/users/{user_id}` — admin

### Leads

- `GET /api/leads/` — admin
- `POST /api/leads/` — admin
- `GET /api/leads/{lead_id}` — admin
- `PUT /api/leads/{lead_id}` — admin
- `DELETE /api/leads/{lead_id}` — admin

### Prospects

- `POST /api/prospects/` — publico, `5/hora` por IP
- `GET /api/prospects/` — admin
- `DELETE /api/prospects/{prospect_id}` — admin

### Notifications

- `GET /api/notifications/recipients` — admin
- `POST /api/notifications/recipients` — admin
- `DELETE /api/notifications/recipients/{recipient_id}` — admin
- `POST /api/notifications/recipients/{recipient_id}/test` — admin

### Diagnostics

- `GET /api/diagnostics/questions/active` — publico
- `POST /api/diagnostics/submit` — publico, `5/hora` por IP
- `GET /api/diagnostics/submissions` — admin
- `GET /api/diagnostics/submissions/{submission_id}` — admin
- `DELETE /api/diagnostics/submissions/{submission_id}` — admin
- `GET /api/diagnostics/questions` — admin
- `POST /api/diagnostics/questions` — admin
- `PUT /api/diagnostics/questions/{question_id}` — admin
- `PATCH /api/diagnostics/questions/reorder` — admin

Swagger y Redoc:

- `/api/docs`
- `/api/redoc`

## Desarrollo local

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Docker Compose dev

`docker-compose.dev.yml` levanta:

- `lyratech-mysql-dev`
- `backend`
- `lyratech-mysql-dev-backup`
- `frontend`

Puertos principales:

- Frontend: `http://localhost:3002`
- Backend: `http://localhost:8001`
- MySQL: `localhost:${DATABASE_PORT}`

Comando:

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up --build
```

## Docker Compose prod

`docker-compose.yml` levanta el equivalente en produccion:

- `lyratech-mysql`
- `lyratech-mysql-backup`
- `backend`
- `frontend`

Puertos principales (solo accesibles desde localhost/VPN en el servidor, nginx hace el reverse proxy hacia 80/443):

- Frontend: `http://localhost:3001`
- Backend: `http://localhost:8000`
- MySQL: `localhost:${DATABASE_PORT}`

## Despliegue (CI/CD)

GitHub Actions (`.github/workflows/`) hace deploy automatico por SSH al VPS en cada push:

- `deploy-dev.yml`: push a `develop` → rebuild + restart de `backend`/`frontend` en el entorno de dev (`dev.lyratech.com.mx`).
- `deploy.yml`: push a `main` → rebuild + restart de `backend`/`frontend` en produccion (`lyratech.com.mx`).

Ambos requieren los secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` configurados en el repo.

## Variables de entorno

Ver `.env.example`.

Las mas importantes:

### Frontend

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_BOOKING_URL`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

### Backend

- `JWT_SECRET_KEY`
- `JWT_ALGORITHM`
- `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`
- `TURNSTILE_SECRET_KEY`
- `BACKEND_CORS_ORIGINS`
- `RESEND_API_KEY`
- `NOTIFICATION_FROM_EMAIL`
- `NOTIFICATION_FROM_NAME`
- `FRONTEND_URL`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `OPENROUTER_BASE_URL`
- `OPENROUTER_TIMEOUT_SECONDS`

### Database

- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `MYSQL_ROOT_PASSWORD`

### Backup

- `BACKUP_MAX_BACKUPS`
- `BACKUP_CRON_TIME`
- `BACKUP_GZIP_LEVEL`

## Tests

Backend:

```bash
python -m pytest backend/app/tests -q
```

Frontend:

```bash
cd frontend
npm run build
```
