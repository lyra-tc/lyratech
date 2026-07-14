# Lyratech

Monorepo del sitio web publico y dashboard interno de Lyratech.

Incluye:
- `frontend/`: sitio multi-idioma en Next.js + dashboard `/dashboard`.
- `backend/`: API REST en FastAPI.
- `backend/database/init.sql`: esquema inicial de MySQL.

## Stack

- Frontend: Next.js 15, React 18, TypeScript, Tailwind CSS, `next-intl`, Framer Motion.
- Backend: FastAPI, SQLAlchemy 2, Pydantic 2, PyMySQL, JWT, bcrypt.
- Integraciones: Cloudflare Turnstile, OpenRouter, Resend.
- Base de datos: MySQL 8.

## Funcionalidad actual

### Sitio publico

- Rutas localizadas en `frontend/src/app/[locale]`.
- Idiomas soportados: `es`, `en`, `fr`, `de`.
- Formularios publicos de contacto/prospects protegidos con Turnstile.
- Flujo `Diagnostic GO` con preguntas dinamicas, scoring y resultado enriquecido por LLM.

### Dashboard

- Login, registro y perfil.
- Gestion de `Leads`.
- Gestion de `Prospects`.
- Gestion de `Notifications`.
- Gestion de `Diagnosticos` enviados.
- Gestion de `Preguntas` del diagnostico, incluyendo reorder.
- Gestion de `Users` para admins.

### Usuarios y permisos

- El primer usuario registrado queda `activo + admin`.
- Si el nombre del usuario es exactamente `Ricardo Sierra Roa`, tambien queda marcado como `superadmin`.
- Los usuarios nuevos normales quedan pendientes de activacion por un admin.
- Solo un `superadmin` puede quitar admin a otro admin normal.
- La cuenta `superadmin` no se puede editar ni eliminar desde el dashboard.

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

- `users.is_admin` inicia en `FALSE` por defecto.
- `users.is_superadmin` inicia en `FALSE` por defecto.
- El backend hace un ajuste de esquema al arrancar para agregar columnas nuevas en instalaciones existentes y marcar como `superadmin` a `Ricardo Sierra Roa`.

## API

Base local esperada:

- Backend directo: `http://localhost:8000`
- Docker dev: `http://localhost:8001`

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/me`
- `PUT /api/auth/change-password`

### Users

- `GET /api/users/`
- `PATCH /api/users/{user_id}`
- `PUT /api/users/{user_id}/reset-password`
- `DELETE /api/users/{user_id}`

### Leads

- `GET /api/leads/`
- `POST /api/leads/`
- `GET /api/leads/{lead_id}`
- `PUT /api/leads/{lead_id}`
- `DELETE /api/leads/{lead_id}`

### Prospects

- `POST /api/prospects/`
- `GET /api/prospects/`
- `DELETE /api/prospects/{prospect_id}`

### Notifications

- `GET /api/notifications/recipients`
- `POST /api/notifications/recipients`
- `DELETE /api/notifications/recipients/{recipient_id}`
- `POST /api/notifications/recipients/{recipient_id}/test`

### Diagnostics

- `GET /api/diagnostics/questions/active`
- `POST /api/diagnostics/submit`
- `GET /api/diagnostics/submissions`
- `GET /api/diagnostics/submissions/{submission_id}`
- `DELETE /api/diagnostics/submissions/{submission_id}`
- `GET /api/diagnostics/questions`
- `POST /api/diagnostics/questions`
- `PUT /api/diagnostics/questions/{question_id}`
- `PATCH /api/diagnostics/questions/reorder`

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
