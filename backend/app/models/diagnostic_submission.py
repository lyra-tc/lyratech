from sqlalchemy import Column, DateTime, Integer, JSON, String, Text
from sqlalchemy.sql import func
from ..database import Base


class DiagnosticSubmission(Base):
    __tablename__ = "diagnostic_submissions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50))
    company = Column(String(255))
    locale = Column(String(5), nullable=False, default="es")
    raw_answers_json = Column(JSON, nullable=False)
    normalized_answers_en_json = Column(JSON, nullable=False)
    service_scores_json = Column(JSON, nullable=False)
    recommended_primary_service = Column(String(50), nullable=False)
    recommended_secondary_service = Column(String(50), nullable=True)
    automation_approach = Column(String(20), nullable=True)
    llm_provider = Column(String(50), nullable=True)
    llm_model = Column(String(100), nullable=True)
    llm_input_json = Column(JSON, nullable=True)
    llm_response_json = Column(JSON, nullable=True)
    llm_status = Column(String(20), nullable=False, default="ok")
    email_delivery_status = Column(String(20), nullable=False, default="pending")
    email_delivery_error = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
