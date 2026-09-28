"""Load the portfolio projects that used to be hardcoded in the frontend.

Run once per environment, inside the backend container:

    python -m scripts.seed_portfolio

Idempotent: a project whose name already exists is skipped. Logos are read
from scripts/portfolio_seed/ and uploaded under STORAGE_ENV_PREFIX. Every
project is validated before anything is written.

Meant to run once per environment, before admins start editing the
portfolio: the skip check is by name, so re-running after an admin has
deleted or renamed a seeded project would re-create it.
"""
import sys
import uuid
from pathlib import Path

from sqlalchemy import func

from app.core.portfolio_files import LOGO_MAX_BYTES, detect_logo
from app.core.storage import MinioStorage, StorageError, object_key, project_prefix
from app.database import Base, SessionLocal, engine
from app.models.portfolio_project import PortfolioProject
from app.schemas.portfolio import PortfolioFields

SEED_DIR = Path(__file__).parent / "portfolio_seed"


def _website(name, url, tech, categories, es, en, fr, de):
    return {
        "name": name,
        "description_es": es,
        "description_en": en,
        "description_fr": fr,
        "description_de": de,
        "technologies": tech,
        "categories": categories,
        "link_type": "website",
        "website_url": url,
    }


PROJECTS = [
    {
        "logo": "Finnova.png",
        "fields": _website(
            "Finnova", "https://finnova.com.mx/",
            ["React Native", "Node.js", "PostgreSQL", "LangChain"], ["mobile", "ai"],
            "App de finanzas personales que centraliza la gestión de dinero y ahorro en una sola plataforma.",
            "Personal finance app that centralizes money management and savings in one platform.",
            "Application de finances personnelles qui centralise la gestion d'argent et l'épargne en une seule plateforme.",
            "Persönliche Finanz-App, die Geldverwaltung und Sparen in einer Plattform vereint.",
        ),
    },
    {
        "logo": "RavePass.svg",
        "fields": _website(
            "RavePass", "https://www.ravepass.com.mx/",
            ["React", "Supabase", "AWS", "BaaS"], ["web"],
            "Plataforma web para descubrir, comprar y gestionar pases a todo tipo de fiestas y eventos en México.",
            "Web platform to discover, buy and manage passes for all kinds of parties and events in Mexico.",
            "Plateforme web pour découvrir, acheter et gérer des passes pour toutes sortes de fêtes et événements au Mexique.",
            "Webplattform zum Entdecken, Kaufen und Verwalten von Pässen für Partys und Veranstaltungen aller Art in Mexiko.",
        ),
    },
    {
        "logo": "Indeleble.png",
        "fields": _website(
            "Indeleble", "https://indeleble.com.mx/",
            ["Next.js"], ["web"],
            "Sitio web corporativo de agencia de marketing",
            "Corporate website for a marketing agency",
            "Site web corporatif pour une agence de marketing",
            "Unternehmenswebsite für eine Marketingagentur",
        ),
    },
    {
        "logo": "PulsoVital.png",
        "fields": _website(
            "Pulso Vital", "https://pulsovital.com.mx/",
            ["Next.js", "Node.js", "PostgreSQL"], ["web", "ai"],
            "Plataforma web de Capacitación en temas de finanzas",
            "Web platform for finance training",
            "Plateforme web de formation en finances",
            "Webplattform für Finanzschulungen",
        ),
    },
    {
        "logo": "CSV.png",
        "fields": _website(
            "CSV Logistics", "https://www.csvlogistics.com.mx/",
            ["Next.js"], ["web"],
            "Sitio web corporativo de empresa de servicios logísticos",
            "Corporate website for a logistics services company",
            "Site web corporatif pour une entreprise de services logistiques",
            "Unternehmenswebsite für ein Logistikdienstleistungsunternehmen",
        ),
    },
    {
        "logo": "Verderaiz.png",
        "fields": _website(
            "Verderaiz", "https://verderaiz.com.mx/",
            ["Next.js", "PHP", "WordPress", "MySQL"], ["web"],
            "Sitio web y Blog con dashboard para organización ecológica",
            "Website and blog with dashboard for environmental organization",
            "Site web et blog avec tableau de bord pour organisation écologique",
            "Website und Blog mit Dashboard für Umweltorganisation",
        ),
    },
    {
        "logo": "NuovaVita.png",
        "fields": _website(
            "Nuova Vita", "https://nuova-vita.netlify.app/",
            ["Next.js"], ["web"],
            "Sitio web corporativo de administración de condominios",
            "Corporate website for condominium management",
            "Site web d’entreprise pour gestion de copropriétés",
            "Unternehmenswebsite für Wohnungsverwaltung",
        ),
    },
    {
        "logo": "MindScope.svg",
        "fields": _website(
            "MindScope", "https://mindscope-landing.netlify.app/",
            ["Next.js", "Node.js", "PostgreSQL"], ["web"],
            "Aplicación web de pruebas psicométricas",
            "Web application for psychometric testing",
            "Application web de tests psychométriques",
            "Webanwendung für psychometrische Tests",
        ),
    },
    {
        "logo": "OnceUponATime.png",
        "fields": _website(
            "Once Upon a Time", "https://once-upona-time.netlify.app/",
            ["Next.js"], ["web"],
            "Sitio web de empresa de viajes",
            "Travel company website",
            "Site web d'une entreprise de voyage",
            "Website eines Reiseunternehmens",
        ),
    },
    {
        "logo": "SacaLaBici.png",
        "fields": {
            "name": "Saca La Bici",
            "description_es": "App red social de Saca La Bici: anuncios, eventos y tracking en vivo de las rodadas en Querétaro.",
            "description_en": "Social network app for Saca La Bici: announcements, events and live tracking of rides in Querétaro.",
            "description_fr": "Appli réseau social pour Saca La Bici : annonces, événements et suivi en direct des sorties à Querétaro.",
            "description_de": "Social-App für Saca La Bici: Ankündigungen, Events und Live-Tracking der Touren in Querétaro.",
            "technologies": ["Kotlin", "Node.js", "AWS"],
            "categories": ["mobile"],
            "link_type": "store",
            "play_store_url": "https://play.google.com/store/apps/details?id=com.kotlin.sacalabici&hl=es_MX",
        },
    },
]


def main() -> int:
    # Validate everything up front: abort before touching MinIO or the DB.
    prepared = []
    for item in PROJECTS:
        fields = PortfolioFields(**item["fields"])
        data = (SEED_DIR / item["logo"]).read_bytes()
        if len(data) > LOGO_MAX_BYTES:
            raise SystemExit(f"{item['logo']} excede 2 MB")
        prepared.append((fields, data, detect_logo(data)))

    Base.metadata.create_all(bind=engine, tables=[PortfolioProject.__table__])
    storage = MinioStorage()
    db = SessionLocal()
    try:
        existing = {name for (name,) in db.query(PortfolioProject.name).all()}
        max_order = db.query(func.max(PortfolioProject.sort_order)).scalar()
        next_order = 0 if max_order is None else max_order + 1
        for fields, data, detected in prepared:
            if fields.name in existing:
                print(f"skip   {fields.name} (ya existe)")
                continue
            project_uuid = str(uuid.uuid4())
            key = object_key(project_prefix(fields.name, project_uuid), "logo", detected.ext)
            try:
                storage.upload(key, data, detected.content_type)
            except StorageError as exc:
                print(f"fail   {fields.name}: {exc}")
                raise
            db.add(PortfolioProject(
                uuid=project_uuid,
                **fields.model_dump(),
                logo_key=key,
                sort_order=next_order,
                is_published=True,
            ))
            try:
                db.commit()
            except Exception:
                db.rollback()
                try:
                    storage.delete(key)
                except StorageError:
                    pass
                raise
            next_order += 1
            print(f"added  {fields.name} -> {key}")
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
