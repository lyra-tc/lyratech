import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from ..database import Base
from ..core.deps import get_db, get_current_user
from ..core.limiter import limiter
from ..models.user import User
from ..routers import auth, diagnostics, leads, notifications, prospects, users

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def _build_test_app() -> FastAPI:
    app = FastAPI()
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
    app.include_router(auth.router, prefix="/api")
    app.include_router(users.router, prefix="/api")
    app.include_router(prospects.router, prefix="/api")
    app.include_router(notifications.router, prefix="/api")
    app.include_router(diagnostics.router, prefix="/api")
    app.include_router(leads.router, prefix="/api")
    app.dependency_overrides[get_db] = _override_get_db
    return app


@pytest.fixture(autouse=True)
def _reset_schema_and_limiter():
    Base.metadata.create_all(bind=engine)
    limiter.reset()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def _force_test_cookie_settings(monkeypatch):
    """Pin session-cookie config so tests don't depend on the local .env.

    In particular a real AUTH_COOKIE_DOMAIN would make the cookie Secure, and
    the http TestClient would then never send it back.
    """
    from ..config import settings

    monkeypatch.setattr(settings, "AUTH_COOKIE_NAME", "lyratech_session", raising=False)
    monkeypatch.setattr(settings, "AUTH_COOKIE_DOMAIN", "", raising=False)


@pytest.fixture
def client():
    return TestClient(_build_test_app())


@pytest.fixture
def auth_client():
    app = _build_test_app()
    app.dependency_overrides[get_current_user] = lambda: User(
        id=1,
        email="admin@lyratech.com.mx",
        full_name="Admin",
        is_active=True,
        is_admin=True,
        is_superadmin=False,
    )
    return TestClient(app)


@pytest.fixture
def non_admin_client():
    app = _build_test_app()
    app.dependency_overrides[get_current_user] = lambda: User(
        id=2,
        email="member@lyratech.com.mx",
        full_name="Member",
        is_active=True,
        is_admin=False,
        is_superadmin=False,
    )
    return TestClient(app)
