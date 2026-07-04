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

    TURNSTILE_SECRET_KEY: str = ""

    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3002",
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
