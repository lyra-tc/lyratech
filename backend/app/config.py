from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: int = 3308
    DATABASE_NAME: str = "lyratech-dev"
    DATABASE_USER: str = "lyratech_user"
    DATABASE_PASSWORD: str = ""

    JWT_SECRET_KEY: str = "change-this-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Session cookie holding the access token. Name differs per environment
    # (prod vs dev share the .lyratech.com.mx parent domain). Domain is empty
    # for local dev (host-only cookie over http); when set, the cookie is Secure.
    AUTH_COOKIE_NAME: str = "lyratech_session"
    AUTH_COOKIE_DOMAIN: str = ""

    TURNSTILE_SECRET_KEY: str = ""

    RESEND_API_KEY: str = ""
    NOTIFICATION_FROM_EMAIL: str = "notificaciones@lyratech.com.mx"
    NOTIFICATION_FROM_NAME: str = "Lyratech"
    FRONTEND_URL: str = ""
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "openai/gpt-4o-mini"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_TIMEOUT_SECONDS: float = 20.0

    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3002",
    ]

    @property
    def auth_cookie_secure(self) -> bool:
        return bool(self.AUTH_COOKIE_DOMAIN)

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
