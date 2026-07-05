from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from .config import settings
from .database import engine, Base, SessionLocal
from .core.limiter import limiter
from .core.diagnostic_seed import seed_diagnostic_questions
from .routers import auth, leads, prospects, notifications, diagnostics

Base.metadata.create_all(bind=engine)

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
app.include_router(leads.router, prefix="/api")
app.include_router(prospects.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(diagnostics.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "service": "lyratech-api"}
