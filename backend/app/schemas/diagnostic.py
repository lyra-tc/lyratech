from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field


# --- Questions -------------------------------------------------------------

class DiagnosticOptionSchema(BaseModel):
    value: str
    labels: Dict[str, str]
    score_weights: Dict[str, int] = Field(default_factory=dict)


class DiagnosticQuestionConfig(BaseModel):
    labels: Dict[str, str]
    placeholder: Dict[str, str] = Field(default_factory=dict)
    help_text: Dict[str, str] = Field(default_factory=dict)
    options: List[DiagnosticOptionSchema] = Field(default_factory=list)


class DiagnosticQuestionCreate(BaseModel):
    key: str
    type: str
    sort_order: int = 0
    is_active: bool = True
    is_required: bool = True
    config_json: DiagnosticQuestionConfig


class DiagnosticQuestionUpdate(BaseModel):
    type: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
    is_required: Optional[bool] = None
    config_json: Optional[DiagnosticQuestionConfig] = None


class DiagnosticQuestionReorder(BaseModel):
    ordered_ids: List[int]


class DiagnosticQuestionResponse(BaseModel):
    id: int
    key: str
    type: str
    sort_order: int
    is_active: bool
    is_required: bool
    config_json: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DiagnosticActiveOption(BaseModel):
    value: str
    label: str


class DiagnosticActiveQuestion(BaseModel):
    """Locale-resolved question shape served to the public widget."""
    key: str
    type: str
    sort_order: int
    is_required: bool
    label: str
    placeholder: str = ""
    help_text: str = ""
    options: List[DiagnosticActiveOption] = Field(default_factory=list)


# --- Submissions -------------------------------------------------------------

class DiagnosticSubmitRequest(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    locale: str
    answers: Dict[str, List[str]]
    turnstile_token: str


class DiagnosticSubmissionResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    locale: str
    raw_answers_json: dict
    normalized_answers_en_json: dict
    service_scores_json: dict
    recommended_primary_service: str
    recommended_secondary_service: Optional[str] = None
    automation_approach: Optional[str] = None
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    llm_response_json: Optional[dict] = None
    llm_status: str
    email_delivery_status: str
    email_delivery_error: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DiagnosticSubmissionListItem(BaseModel):
    id: int
    name: str
    email: str
    company: Optional[str] = None
    locale: str
    recommended_primary_service: str
    recommended_secondary_service: Optional[str] = None
    email_delivery_status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DiagnosticSubmitResult(BaseModel):
    """What the public endpoint returns to the widget after a successful submit."""
    submission_id: int
    headline: str
    summary: str
    recommended_service: str
    secondary_service: Optional[str] = None
    why_it_fits: str
    key_opportunities: List[str]
    suggested_next_steps: List[str]
    confidence_note: str
    service_scores: Dict[str, int]
