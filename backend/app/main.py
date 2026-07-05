from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import inspect, text

from .config import settings
from .core.diagnostic_seed import seed_diagnostic_questions
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

    with engine.begin() as connection:
        connection.execute(
            text(
                """
                UPDATE users
                SET is_superadmin = TRUE, is_admin = TRUE, is_active = TRUE
                WHERE LOWER(TRIM(full_name)) = 'ricardo sierra roa'
                """
            )
        )


Base.metadata.create_all(bind=engine)
ensure_user_management_schema()

_seed_db = SessionLocal()
try:
    seed_diagnostic_questions(_seed_db)
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

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(leads.router, prefix="/api")
app.include_router(prospects.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(diagnostics.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "service": "lyratech-api"}
