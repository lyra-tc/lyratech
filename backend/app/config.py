from pydantic import field_validator
from pydantic_settings import BaseSettings
from typing import List, Literal


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

    # Object storage (MinIO) for portfolio logos/videos. STORAGE_ENV_PREFIX is
    # the top-level folder inside the bucket, so local/dev/prod never collide.
    MINIO_ENDPOINT: str = ""
    MINIO_SECURE: bool = True
    MINIO_ACCESS_KEY: str = ""
    MINIO_SECRET_KEY: str = ""
    MINIO_BUCKET: str = "lyratech"
    MINIO_PUBLIC_URL: str = ""
    STORAGE_ENV_PREFIX: Literal["local", "dev", "prod"] = "local"

    @field_validator("STORAGE_ENV_PREFIX", mode="before")
    @classmethod
    def _default_storage_env_prefix(cls, value):
        # A blank value (e.g. a copied .env.example, or docker-compose's own
        # default not applying because the var was set-but-empty) must not
        # crash startup — treat it the same as leaving the setting unset.
        if not value:
            return "local"
        return value

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
