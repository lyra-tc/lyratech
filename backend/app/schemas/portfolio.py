from datetime import datetime
from typing import List, Literal, Optional
from urllib.parse import urlparse

from pydantic import BaseModel, ValidationInfo, field_validator, model_validator

from ..models.portfolio_project import PortfolioLinkType

# Mirrored in frontend/src/lib/portfolioConstants.ts — keep both in sync.
NAME_MAX = 40
DESCRIPTION_MAX = 120
TECH_MAX_COUNT = 10
TECH_MAX_LENGTH = 20
URL_MAX = 500
CATEGORIES = ("web", "mobile", "ai")
LOCALES = ("es", "en", "fr", "de")
PLAY_STORE_HOST = "play.google.com"
APP_STORE_HOST = "apps.apple.com"


def _required_text(value, label: str, max_length: int) -> str:
    if value is not None and not isinstance(value, str):
        raise ValueError(f"{label} debe ser texto")
    value = (value or "").strip()
    if not value:
        raise ValueError(f"{label} es requerido")
    if len(value) > max_length:
        raise ValueError(f"{label} no puede exceder {max_length} caracteres")
    return value


def _optional_url(value, label: str, host: Optional[str] = None) -> Optional[str]:
    if value is not None and not isinstance(value, str):
        raise ValueError(f"{label} debe ser texto")
    value = (value or "").strip()
    if not value:
        return None
    if len(value) > URL_MAX:
        raise ValueError(f"{label} es demasiado larga")
    parsed = urlparse(value)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise ValueError(f"{label} debe ser una URL válida (http/https)")
    if host and parsed.hostname != host:
        raise ValueError(f"{label} debe ser de {host}")
    return value


class PortfolioFields(BaseModel):
    """Everything an admin edits except the files.

    Validated as a whole on create and, on PATCH, against the merged
    (stored + submitted) state, so the link_type rules always hold.
    """

    name: str
    description_es: str
    description_en: str
    description_fr: str
    description_de: str
    technologies: List[str] = []
    categories: List[str]
    link_type: PortfolioLinkType
    website_url: Optional[str] = None
    play_store_url: Optional[str] = None
    app_store_url: Optional[str] = None

    @field_validator("name", mode="before")
    @classmethod
    def _name(cls, value):
        return _required_text(value, "El nombre", NAME_MAX)

    @field_validator(
        "description_es", "description_en", "description_fr", "description_de",
        mode="before",
    )
    @classmethod
    def _description(cls, value, info: ValidationInfo):
        locale = info.field_name.rsplit("_", 1)[1].upper()
        return _required_text(value, f"La descripción ({locale})", DESCRIPTION_MAX)

    @field_validator("technologies")
    @classmethod
    def _technologies(cls, value: List[str]) -> List[str]:
        cleaned = [tech.strip() for tech in value]
        if any(not tech for tech in cleaned):
            raise ValueError("Las tecnologías no pueden estar vacías")
        if len(cleaned) > TECH_MAX_COUNT:
            raise ValueError(f"Máximo {TECH_MAX_COUNT} tecnologías")
        if any(len(tech) > TECH_MAX_LENGTH for tech in cleaned):
            raise ValueError(
                f"Cada tecnología puede tener máximo {TECH_MAX_LENGTH} caracteres"
            )
        if len({tech.lower() for tech in cleaned}) != len(cleaned):
            raise ValueError("Hay tecnologías repetidas")
        return cleaned

    @field_validator("categories")
    @classmethod
    def _categories(cls, value: List[str]) -> List[str]:
        if not value:
            raise ValueError("Selecciona al menos una categoría")
        if any(category not in CATEGORIES for category in value):
            raise ValueError("Categoría inválida")
        if len(set(value)) != len(value):
            raise ValueError("Hay categorías repetidas")
        return value

    @field_validator("website_url", mode="before")
    @classmethod
    def _website_url(cls, value):
        return _optional_url(value, "La URL del sitio web")

    @field_validator("play_store_url", mode="before")
    @classmethod
    def _play_store_url(cls, value):
        return _optional_url(value, "El link de Play Store", PLAY_STORE_HOST)

    @field_validator("app_store_url", mode="before")
    @classmethod
    def _app_store_url(cls, value):
        return _optional_url(value, "El link de App Store", APP_STORE_HOST)

    @model_validator(mode="after")
    def _link_rules(self):
        if self.link_type == PortfolioLinkType.website:
            if not self.website_url:
                raise ValueError("La URL del sitio web es requerida")
            self.play_store_url = None
            self.app_store_url = None
        elif self.link_type == PortfolioLinkType.store:
            if not (self.play_store_url or self.app_store_url):
                raise ValueError("Agrega al menos un link de Play Store o App Store")
            self.website_url = None
        else:
            self.website_url = None
            self.play_store_url = None
            self.app_store_url = None
        return self


class PortfolioDescriptions(BaseModel):
    es: str
    en: str
    fr: str
    de: str


class PortfolioPublic(BaseModel):
    uuid: str
    name: str
    descriptions: PortfolioDescriptions
    technologies: List[str]
    categories: List[str]
    link_type: PortfolioLinkType
    website_url: Optional[str] = None
    play_store_url: Optional[str] = None
    app_store_url: Optional[str] = None
    logo_url: str
    video_url: Optional[str] = None


class PortfolioAdmin(PortfolioPublic):
    id: int
    sort_order: int
    is_published: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class PortfolioMove(BaseModel):
    direction: Literal["up", "down"]


class PortfolioPublish(BaseModel):
    is_published: bool
