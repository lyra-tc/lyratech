from app.core.portfolio_files import LOGO_MAX_BYTES, detect_logo
from app.schemas.portfolio import PortfolioFields
from scripts.seed_portfolio import PROJECTS, SEED_DIR


def test_seed_projects_are_valid_and_logos_exist():
    assert len(PROJECTS) == 10
    names = set()
    for item in PROJECTS:
        fields = PortfolioFields(**item["fields"])
        names.add(fields.name)
        data = (SEED_DIR / item["logo"]).read_bytes()
        assert len(data) <= LOGO_MAX_BYTES, item["logo"]
        detect_logo(data)
    assert len(names) == 10
