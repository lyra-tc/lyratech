from app.models.portfolio_project import PortfolioLinkType, PortfolioProject
from app.tests.conftest import TestingSessionLocal


def test_model_round_trips_json_lists_and_defaults():
    db = TestingSessionLocal()
    try:
        project = PortfolioProject(
            uuid="11111111-1111-1111-1111-111111111111",
            name="Demo",
            description_es="es", description_en="en",
            description_fr="fr", description_de="de",
            technologies=["Next.js", "Node.js"],
            categories=["web"],
            link_type=PortfolioLinkType.website,
            website_url="https://demo.test",
            logo_key="local/portafolio/demo-1/logo.png",
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        assert project.technologies == ["Next.js", "Node.js"]
        assert project.categories == ["web"]
        assert project.is_published is True
        assert project.sort_order == 0
        assert project.video_key is None
    finally:
        db.close()


import pytest
from pydantic import ValidationError

from app.schemas.portfolio import PortfolioFields


def _valid(**overrides):
    data = {
        "name": "Saca La Bici",
        "description_es": "App de rodadas",
        "description_en": "Rides app",
        "description_fr": "Appli de sorties",
        "description_de": "Touren-App",
        "technologies": ["Kotlin", "Node.js"],
        "categories": ["mobile"],
        "link_type": "website",
        "website_url": "https://example.com",
    }
    data.update(overrides)
    return data


def test_valid_fields_are_trimmed():
    fields = PortfolioFields(**_valid(name="  Saca La Bici  ", technologies=[" Kotlin "]))
    assert fields.name == "Saca La Bici"
    assert fields.technologies == ["Kotlin"]


def test_limits_accept_exact_maximums():
    PortfolioFields(**_valid(
        name="n" * 40,
        description_de="d" * 120,
        technologies=[f"tech{i}" for i in range(10)],
    ))
    PortfolioFields(**_valid(technologies=["t" * 20]))


@pytest.mark.parametrize(
    "overrides, message",
    [
        ({"name": "n" * 41}, "40"),
        ({"name": "   "}, "requerido"),
        ({"description_fr": "d" * 121}, "(FR)"),
        ({"description_en": ""}, "(EN)"),
        ({"technologies": [f"t{i}" for i in range(11)]}, "Máximo 10"),
        ({"technologies": ["t" * 21]}, "20"),
        ({"technologies": ["React", "react"]}, "repetidas"),
        ({"technologies": [" "]}, "vacías"),
        ({"categories": []}, "al menos una"),
        ({"categories": ["iot"]}, "inválida"),
        ({"categories": ["web", "web"]}, "repetidas"),
        ({"website_url": None}, "sitio web"),
        ({"website_url": "ftp://example.com"}, "URL válida"),
        ({"link_type": "store", "website_url": None}, "Play Store o App Store"),
        ({"link_type": "store", "play_store_url": "https://evil.test/app"}, "play.google.com"),
        ({"link_type": "store", "app_store_url": "https://play.google.com/x"}, "apps.apple.com"),
    ],
)
def test_invalid_fields_are_rejected(overrides, message):
    with pytest.raises(ValidationError, match=message):
        PortfolioFields(**_valid(**overrides))


def test_store_type_clears_website_url():
    fields = PortfolioFields(**_valid(
        link_type="store",
        play_store_url="https://play.google.com/store/apps/details?id=x",
    ))
    assert fields.website_url is None
    assert fields.app_store_url is None


def test_website_type_clears_store_urls():
    fields = PortfolioFields(**_valid(play_store_url="https://play.google.com/x"))
    assert fields.play_store_url is None


def test_video_type_clears_all_urls():
    fields = PortfolioFields(**_valid(link_type="video"))
    assert fields.website_url is None


def test_blank_urls_become_none():
    fields = PortfolioFields(**_valid(
        link_type="store",
        website_url="",
        play_store_url="https://play.google.com/x",
        app_store_url="   ",
    ))
    assert fields.app_store_url is None


def test_non_string_name_is_rejected():
    with pytest.raises(ValidationError, match="texto"):
        PortfolioFields(**_valid(name=123))
