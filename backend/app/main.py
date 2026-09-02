from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import inspect, text

from .config import settings
from .core.diagnostic_seed import seed_diagnostic_questions
from .core.idempotency import cleanup_old_turnstile_tokens
from .core.limiter import limiter
from .database import Base, SessionLocal, engine
from .routers import auth, diagnostics, leads, notifications, prospects, users


def ensure_user_management_schema() -> None:
    inspector = inspect(engine)
    columns = {column["name"] for column in inspector.get_columns("users")}

    if "is_admin" not in columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT TRUE"
                )
            )

    if "is_superadmin" not in columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE users ADD COLUMN is_superadmin BOOLEAN NOT NULL DEFAULT FALSE"
                )
            )

    if "password_changed_at" not in columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
                )
            )


def ensure_leads_prospects_swap() -> None:
    if engine.dialect.name != "mysql":
        return  # the chained RENAME TABLE form below is MySQL-only

    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    if "leads" not in table_names or "prospects" not in table_names:
        return

    lead_columns = {c["name"] for c in inspector.get_columns("leads")}
    if "message" not in lead_columns:
        # Roles are still the old way round -- swap the two tables atomically.
        with engine.begin() as connection:
            connection.execute(
                text(
                    "RENAME TABLE leads TO _leads_prospects_swap_tmp, "
                    "prospects TO leads, "
                    "_leads_prospects_swap_tmp TO prospects"
                )
            )

    # Independent of the swap above and safe to run on every boot: the pipeline
    # table needs a `service` column the old `leads` table never had. Kept
    # separate so a crash between the RENAME and here self-heals next boot.
    # Fresh inspector: the cached metadata above is stale after the RENAME.
    prospect_columns = {c["name"] for c in inspect(engine).get_columns("prospects")}
    if "service" not in prospect_columns:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE prospects ADD COLUMN service VARCHAR(100)")
            )


Base.metadata.create_all(bind=engine)
ensure_user_management_schema()
ensure_leads_prospects_swap()

_seed_db = SessionLocal()
try:
    seed_diagnostic_questions(_seed_db)
    cleanup_old_turnstile_tokens(_seed_db)
finally:
    _seed_db.close()

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

_DOCS_PATHS = {"/api/docs", "/api/redoc", "/api/openapi.json"}


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = (
        "max-age=63072000; includeSubDomains; preload"
    )
    if request.url.path not in _DOCS_PATHS:
        response.headers["Content-Security-Policy"] = "default-src 'none'"
    return response

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(leads.router, prefix="/api")
app.include_router(prospects.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(diagnostics.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "service": "lyratech-api"}
