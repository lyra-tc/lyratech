import enum

from sqlalchemy import JSON, Boolean, Column, DateTime, Enum, Index, Integer, String
from sqlalchemy.sql import func

from ..database import Base


class PortfolioLinkType(str, enum.Enum):
    website = "website"
    store = "store"
    video = "video"


class PortfolioProject(Base):
    __tablename__ = "portfolio_projects"
    __table_args__ = (Index("idx_portfolio_sort_order", "sort_order"),)

    id = Column(Integer, primary_key=True, index=True)
    # Ties the row to its MinIO folder ({env}/portafolio/{slug}-{uuid}/).
    uuid = Column(String(36), nullable=False, unique=True)
    name = Column(String(40), nullable=False)
    description_es = Column(String(120), nullable=False)
    description_en = Column(String(120), nullable=False)
    description_fr = Column(String(120), nullable=False)
    description_de = Column(String(120), nullable=False)
    technologies = Column(JSON, nullable=False, default=list)
    categories = Column(JSON, nullable=False, default=list)

    link_type = Column(Enum(PortfolioLinkType), nullable=False)
    website_url = Column(String(500))
    play_store_url = Column(String(500))
    app_store_url = Column(String(500))

    logo_key = Column(String(500), nullable=False)
    video_key = Column(String(500))

    sort_order = Column(Integer, nullable=False, default=0)
    is_published = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
