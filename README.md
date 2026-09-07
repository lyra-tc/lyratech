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
- Formulario publico de contacto (crea `leads`) protegido con Turnstile.
- Flujo `Diagnostic GO` con preguntas dinamicas, scoring y resultado enriquecido por LLM.
- Tarjetas digitales de contacto por persona (`/ezzat`, `/ricardo`, `/galo`, `/daniel-contreras`, `/daniel-queijeiro`, ...) con QR y accesos directos a telefono/correo.

### Dashboard

- Login, registro, logout y perfil (cualquier usuario activo).
- `Leads`: ver, alta manual, importacion masiva (CSV/Excel), edicion y convertir a prospecto. Borrar — solo admin. El alta publica llega del formulario de contacto.
- `Prospects`: pipeline de 3 estados (`agendar reunion` / `llamar despues` / `perdido`, mas `reunion agendada` via el flujo de booking), alta, edicion, agendar reunion. Transformar a cliente y borrar — solo admin. Los leads se convierten en prospects.
- `Clientes`: alta desde un prospecto, listado, ficha con calendario de pagos y comisiones — solo admin.
- `Ingresos`: grafica de ingresos cobrados por mes (`/dashboard/ingresos`) con filtros, KPIs, tabla de desglose y export CSV — solo admin.
- `Diagnosticos` enviados: ver lista y detalle, refrescar estado de entrega del correo, convertir a prospecto. Borrar — solo admin.
- `Notifications` (destinatarios de aviso) — solo admin.
- `Preguntas` del diagnostico, incluyendo reorder — solo admin.
- `Users` (activar cuentas, cambiar rol, reset de contrasena) — solo admin.

### Usuarios y permisos

- El primer usuario registrado queda `activo + admin` automaticamente (bootstrap inicial).
- Cualquier otro registro nuevo queda `pendiente` (`is_active = false`) hasta que un admin lo active desde `/dashboard/users`.
- `is_superadmin` no se otorga por ningun flujo automatico ni por nombre — solo se asigna manualmente en la base de datos. Es una salvaguarda extra: la cuenta `superadmin` no puede ser editada, desactivada ni eliminada desde el dashboard (ni por otros admins).
- Solo un `superadmin` puede quitar `admin` a otro admin normal.

Hay tres niveles de acceso:

| Nivel | Que puede hacer |
|---|---|
| **usuario** (activo, sin `is_admin`) | Su propio perfil. Ver, crear, editar, importar y convertir en `Leads`, `Prospects` y `Diagnosticos` (incluye agendar reunion y marcar diagnostico convertido). **No** puede borrar nada, ni acceder a `Clientes`, `Ingresos`, `Notifications`, `Preguntas` ni `Users`, ni transformar un prospecto en cliente. |
| **admin** | Todo el dashboard: los borrados, `Clientes`, `Ingresos`, `Notifications`, `Preguntas`, `Users` y transformar prospecto -> cliente. |
| **superadmin** | Lo mismo que admin, mas quitar `admin` a otros admins. Su cuenta es inmutable desde el dashboard. |

El bloqueo del nivel `usuario` se aplica en el backend (respuesta `403`), no solo ocultando botones en la UI. Una cuenta con `is_active = false` no puede entrar en absoluto.

## Seguridad

- HTTPS + HSTS en produccion; headers `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy` (backend, `app/main.py`) y equivalentes en el frontend (`next.config.ts`).
- Auth del dashboard por **cookie de sesion httpOnly** (`SameSite=Lax`, `Secure` en produccion) que transporta el JWT — no accesible desde JavaScript (`app/core/cookies.py`). El backend acepta ademas `Authorization: Bearer` como fallback. El middleware de Next (`frontend/src/middleware.ts`) redirige a `/dashboard/login` cuando no hay cookie, y el layout protegido revalida la sesion contra `/auth/me` antes de renderizar.
- `POST /api/auth/logout` limpia la cookie de sesion.
- Cambiar la contrasena (por el propio usuario o por un admin) invalida cualquier token emitido antes de ese momento (`users.password_changed_at` + claim `iat` del JWT).
- Contrasenas con `bcrypt`; minimo 6 caracteres al registrar y al cambiar contrasena.
- Rate limiting por IP (`slowapi`): login `5/minuto`, registro `5/hora`, formulario de contacto y envio de diagnostico `5/hora` cada uno.
- Proteccion anti-duplicado en `leads` y `diagnostics/submit`: cada token de Turnstile solo puede reclamarse una vez (tabla `used_turnstile_tokens`, ver `app/core/idempotency.py`), evitando doble registro/doble llamada a OpenRouter por doble-click o reintento de red. El frontend tambien bloquea el segundo click antes de disparar la peticion.
- CORS restringido a los origenes del frontend (`BACKEND_CORS_ORIGINS`), no wildcard.
- Logging de eventos de seguridad (login fallido/exitoso, registro, cambios de rol, borrado de cuentas, reset de contrasena por admin) via logger `security`.
- Sin SQL crudo: todo el acceso a datos pasa por SQLAlchemy ORM parametrizado.

## Estructura del repo

```text
lyratech/
|-- .github/workflows/       # deploy-dev.yml (develop), deploy.yml (main)
|-- backend/
|   |-- app/
|   |   |-- core/            # auth, cookies, email, turnstile, lead import, idempotency
|   |   |-- models/
|   |   |-- routers/
|   |   |-- schemas/
|   |   |-- services/        # logica de negocio (p.ej. client_revenue)
|   |   |-- tests/           # pytest (SQLite en memoria)
|   |   `-- main.py
|   |-- database/
|   |   `-- init.sql
|   |-- requirements.txt
|   `-- Dockerfile
|-- frontend/
|   |-- src/
|   |   |-- app/             # [locale]/ (sitio) + dashboard/
|   |   |-- components/
|   |   |-- hooks/
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
- `clients`
- `client_payments`
- `notification_recipients`
- `diagnostic_questions`
- `diagnostic_submissions`
- `used_turnstile_tokens`

Notas:

- `users.is_admin` inicia en `FALSE` por defecto (excepto el primer usuario registrado, ver "Usuarios y permisos").
- `users.is_superadmin` inicia en `FALSE` por defecto y solo se asigna manualmente en la base de datos, nunca por la API.
- El backend hace ajustes de esquema al arrancar (los helpers `ensure_*_schema` en `app/main.py`) para agregar columnas nuevas (roles, giro/direccion, estado de conversion y de entrega de correo, etc.) en instalaciones que vengan de una version anterior de `init.sql`.
- `init.sql` solo corre una vez, cuando el volumen de MySQL esta vacio (primer arranque del contenedor). En una base de datos ya existente, las tablas nuevas (como `clients`, `client_payments` o `used_turnstile_tokens`) las crea automaticamente SQLAlchemy (`Base.metadata.create_all` en `app/main.py`) la siguiente vez que arranca el backend — no hace falta migrar nada a mano.
- `used_turnstile_tokens` se limpia sola: al arrancar, el backend borra las filas de mas de 30 dias (`cleanup_old_turnstile_tokens`).

## API

Base local esperada:

- Backend directo: `http://localhost:8000`
- Docker dev: `http://localhost:8001`

Niveles de acceso: **publico** (sin sesion), **auth** (usuario activo — puede operar el pipeline), **admin** (`is_admin` — ademas borra, y accede a clientes/ingresos/notificaciones/preguntas/usuarios).

### Auth

- `POST /api/auth/register` — publico, `5/hora` por IP
- `POST /api/auth/login` — publico, `5/minuto` por IP (fija la cookie de sesion)
- `POST /api/auth/logout` — limpia la cookie de sesion
- `GET /api/auth/me` — auth
- `PUT /api/auth/me` — auth
- `PUT /api/auth/change-password` — auth

### Users

- `GET /api/users/` — admin
- `PATCH /api/users/{user_id}` — admin
- `PUT /api/users/{user_id}/reset-password` — admin
- `DELETE /api/users/{user_id}` — admin

### Leads

- `POST /api/leads/` — publico, `5/hora` por IP, protegido con Turnstile (formulario de contacto)
- `POST /api/leads/manual` — auth (alta manual desde el dashboard)
- `GET /api/leads/import/template` — auth (plantilla xlsx)
- `POST /api/leads/import` — auth (importacion masiva CSV/Excel)
- `GET /api/leads/` — auth
- `PUT /api/leads/{lead_id}` — auth
- `POST /api/leads/{lead_id}/convert` — auth (crea el prospecto y borra el lead en una sola transaccion)
- `DELETE /api/leads/{lead_id}` — admin

### Prospects

- `GET /api/prospects/` — auth
- `GET /api/prospects/stats` — auth
- `POST /api/prospects/` — auth
- `GET /api/prospects/{prospect_id}` — auth
- `PUT /api/prospects/{prospect_id}` — auth
- `DELETE /api/prospects/{prospect_id}` — admin

### Clients

- `GET /api/clients/` — admin
- `GET /api/clients/stats` — admin
- `GET /api/clients/revenue` — admin (serie mensual de ingresos cobrados + KPIs + desglose)
- `GET /api/clients/revenue/filters` — admin (valores disponibles para filtrar)
- `GET /api/clients/revenue/export` — admin (CSV)
- `POST /api/clients/from-prospect/{prospect_id}` — admin (transforma el prospecto en cliente y lo borra)
- `GET /api/clients/{client_id}` — admin
- `PUT /api/clients/{client_id}` — admin (incluye el calendario de pagos)
- `DELETE /api/clients/{client_id}` — admin

### Notifications

- `GET /api/notifications/recipients` — admin
- `POST /api/notifications/recipients` — admin
- `DELETE /api/notifications/recipients/{recipient_id}` — admin
- `POST /api/notifications/recipients/{recipient_id}/test` — admin

### Diagnostics

- `GET /api/diagnostics/questions/active` — publico
- `POST /api/diagnostics/submit` — publico, `5/hora` por IP
- `GET /api/diagnostics/submissions` — auth
- `GET /api/diagnostics/submissions/{submission_id}` — auth
- `POST /api/diagnostics/submissions/refresh-email-status` — auth (consulta el estado de entrega en Resend)
- `POST /api/diagnostics/submissions/{submission_id}/mark-converted` — auth (marca el diagnostico como convertido a un prospecto existente)
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
- `NEXT_PUBLIC_SITE_URL` (dominio absoluto usado por `sitemap.xml`/`robots.txt`; por defecto `https://lyratech.com.mx` en produccion y `https://dev.lyratech.com.mx` en dev)

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