# Lyratech

Monorepo del sitio web y CRM interno de Lyratech: landing pages públicas (multi-idioma) construidas con Next.js y un dashboard de gestión de leads respaldado por una API en FastAPI + MySQL.

## Arquitectura

```
┌─────────────────────┐        HTTPS/JSON        ┌──────────────────────┐        SQL         ┌──────────────┐
│   Frontend (Next.js) │  ───────────────────────▶ │   Backend (FastAPI)  │ ─────────────────▶ │  MySQL 8.0    │
│  Puerto 3000 / 3002   │ ◀─────────────────────── │   Puerto 8000         │ ◀───────────────── │  Puerto 3308  │
└─────────────────────┘                            └──────────────────────┘                    └──────────────┘
        │                                                     │
        │ next-intl (i18n)                                   │ SQLAlchemy ORM (queries parametrizadas)
        │ JWT (localStorage/cookies)                          │ bcrypt (hash de contraseñas)
        ▼                                                     ▼
  Páginas públicas (es/en/fr/de)                     Autenticación (JWT) + CRUD de Leads
  Dashboard /dashboard (CRM)
```

- **Frontend**: Next.js (App Router) sirve tanto el sitio público con soporte multi-idioma (`[locale]`) como el dashboard del CRM (`/dashboard`), que consume la API del backend vía `fetch` (ver `frontend/src/lib/api.ts`).
- **Backend**: API REST en FastAPI que expone autenticación (`/api/auth`) y gestión de leads (`/api/leads`), protegida con JWT.
- **Base de datos**: MySQL 8.0, con esquema definido en `backend/database/init.sql` (tablas `users` y `leads`).
- **Orquestación**: Docker Compose levanta los tres servicios (MySQL, backend, frontend) más un contenedor de backups automáticos de la base de datos.

## Estructura del repo

```
lyratech/
├── backend/                 # API FastAPI
│   ├── app/
│   │   ├── main.py          # Punto de entrada de la app, CORS, routers
│   │   ├── config.py        # Settings (variables de entorno vía pydantic-settings)
│   │   ├── database.py      # Engine y sesión de SQLAlchemy
│   │   ├── core/            # Seguridad (JWT, bcrypt) y dependencias (auth, DB session)
│   │   ├── models/          # Modelos ORM (User, Lead)
│   │   ├── schemas/         # Esquemas Pydantic (validación de entrada/salida)
│   │   └── routers/         # Endpoints (auth, leads)
│   ├── database/init.sql    # Script de inicialización del esquema MySQL
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                 # Next.js (App Router)
│   └── src/
│       ├── app/[locale]/    # Sitio público (home, servicios, portfolio, contacto, etc.)
│       ├── app/dashboard/   # CRM: login, register, leads, settings
│       ├── components/      # Componentes de UI por sección
│       ├── lib/api.ts       # Cliente HTTP hacia el backend
│       ├── messages/        # Traducciones (en, es, fr, de)
│       └── middleware.ts    # Enrutamiento por idioma (next-intl)
├── docker-compose.yml        # Orquestación (producción)
├── docker-compose.dev.yml    # Orquestación (desarrollo)
└── .env.example               # Variables de entorno de ejemplo
```

## Backend (FastAPI)

**Stack**: FastAPI, SQLAlchemy 2.0, PyMySQL, python-jose (JWT), bcrypt, Pydantic v2.

### Endpoints principales

| Método | Ruta                     | Descripción                          | Auth |
|--------|--------------------------|---------------------------------------|------|
| POST   | `/api/auth/register`     | Registro de usuario                   | No   |
| POST   | `/api/auth/login`        | Login, devuelve token JWT             | No   |
| GET    | `/api/auth/me`           | Perfil del usuario autenticado        | Sí   |
| PUT    | `/api/auth/me`           | Actualizar perfil                     | Sí   |
| PUT    | `/api/auth/change-password` | Cambiar contraseña                | Sí   |
| GET    | `/api/leads`             | Listar leads (paginado)               | Sí   |
| POST   | `/api/leads`             | Crear lead                            | Sí   |
| GET    | `/api/leads/{id}`        | Obtener lead                          | Sí   |
| PUT    | `/api/leads/{id}`        | Actualizar lead                       | Sí   |
| DELETE | `/api/leads/{id}`        | Eliminar lead                         | Sí   |
| GET    | `/health`                | Health check                          | No   |

Documentación interactiva (Swagger/Redoc) disponible en `/api/docs` y `/api/redoc` cuando el servidor está corriendo.

### Seguridad de datos
- Todo el acceso a la base de datos se hace a través del ORM de SQLAlchemy con filtros parametrizados (sin SQL crudo ni concatenación de strings), lo que previene inyección SQL.
- Contraseñas hasheadas con bcrypt; nunca se almacenan en texto plano.
- Autenticación basada en JWT (`python-jose`), con expiración configurable.

### Correr localmente

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env   # configurar variables de entorno
uvicorn app.main:app --reload --port 8000
```

## Frontend (Next.js)

**Stack**: Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS, next-intl (i18n), Framer Motion, Three.js.

### Secciones
- **Sitio público** (`src/app/[locale]/`): landing, servicios, portfolio, tarjetas de presentación digitales, contacto, etc. Disponible en español (default), inglés, francés y alemán mediante `next-intl` y los archivos de traducción en `src/messages/`.
- **Dashboard / CRM** (`src/app/dashboard/`): login, registro, listado/gestión de leads y configuración de cuenta. Se comunica con el backend mediante el cliente en `src/lib/api.ts`, usando el token JWT devuelto por `/api/auth/login`.

### Correr localmente

```bash
cd frontend
npm install
npm run dev
```

## Docker Compose (desarrollo)

`docker-compose.dev.yml` levanta:
- `lyratech-mysql-dev`: MySQL 8.0, inicializado con `backend/database/init.sql`.
- `backend`: API FastAPI en el puerto `8000`.
- `lyratech-mysql-dev-backup`: backups automáticos programados (cron) de la base de datos.
- `frontend`: Next.js en el puerto `3002` (mapeado al `3000` interno).

```bash
cp .env.example .env   # completar valores (contraseñas, JWT secret, etc.)
docker compose -f docker-compose.dev.yml up --build
```

## Variables de entorno

Ver `.env.example` en la raíz. Entre las más relevantes:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_HOST` / `DATABASE_PORT` / `DATABASE_NAME` / `DATABASE_USER` / `DATABASE_PASSWORD` | Conexión a MySQL |
| `MYSQL_ROOT_PASSWORD` | Contraseña root de MySQL (solo contenedor) |
| `JWT_SECRET_KEY` / `JWT_ALGORITHM` / `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Configuración de tokens JWT |
| `BACKEND_CORS_ORIGINS` | Orígenes permitidos por CORS en el backend |
| `BACKUP_MAX_BACKUPS` / `BACKUP_CRON_TIME` / `BACKUP_GZIP_LEVEL` | Configuración de backups de la base de datos |
