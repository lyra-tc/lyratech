import re

from app.config import Settings
from app.core.storage import object_key, project_prefix, public_url, slugify


def test_blank_storage_env_prefix_defaults_to_local():
    assert Settings(STORAGE_ENV_PREFIX="").STORAGE_ENV_PREFIX == "local"


def test_slugify_strips_accents_and_symbols():
    assert slugify("Saca La Bici") == "saca-la-bici"
    assert slugify("  Café & Más!! ") == "cafe-mas"
    assert slugify("Once Upon a Time") == "once-upon-a-time"


def test_slugify_falls_back_when_nothing_is_left():
    assert slugify("¡¡¡") == "proyecto"


def test_slugify_truncates_without_trailing_dash():
    slug = slugify("a" * 39 + " bbbb")
    assert len(slug) <= 40
    assert not slug.endswith("-")


def test_project_prefix_uses_env_prefix_slug_and_uuid():
    # conftest pins STORAGE_ENV_PREFIX="local"
    assert (
        project_prefix("Saca La Bici", "1234")
        == "local/portafolio/saca-la-bici-1234/"
    )


def test_object_key_is_unique_and_keeps_extension():
    first = object_key("local/portafolio/x-1/", "logo", "png")
    second = object_key("local/portafolio/x-1/", "logo", "png")
    assert first != second
    assert re.fullmatch(r"local/portafolio/x-1/logo-\d+-[0-9a-f]{6}\.png", first)


def test_public_url_joins_base_bucket_and_key():
    # conftest pins MINIO_PUBLIC_URL="https://media.test/" (trailing slash on purpose)
    assert (
        public_url("local/portafolio/x-1/logo.png")
        == "https://media.test/lyratech/local/portafolio/x-1/logo.png"
    )
