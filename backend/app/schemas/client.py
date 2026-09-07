from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, model_validator

from ..models.client import ClientStatus, ComisionTipo, PaymentType


class ClientPaymentInput(BaseModel):
    due_date: date
    concept: Optional[str] = None
    amount: Decimal = Field(ge=0)
    is_paid: bool = False
    paid_date: Optional[date] = None


class ClientPaymentResponse(BaseModel):
    id: int
    due_date: date
    concept: Optional[str] = None
    amount: Decimal
    is_paid: bool
    paid_date: Optional[date] = None

    model_config = {"from_attributes": True}


def _check_commission(tipo: Optional[ComisionTipo], valor: Optional[Decimal]) -> None:
    if tipo == ComisionTipo.porcentaje and valor is not None and not (0 <= valor <= 100):
        raise ValueError("El porcentaje de comisión debe estar entre 0 y 100")
    if valor is not None and valor < 0:
        raise ValueError("La comisión no puede ser negativa")


class ClientFromProspect(BaseModel):
    responsable: str
    comisionista: Optional[str] = None
    comision_tipo: Optional[ComisionTipo] = None
    comision_valor: Optional[Decimal] = None

    @model_validator(mode="after")
    def _commission(self):
        _check_commission(self.comision_tipo, self.comision_valor)
        return self


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    industry: Optional[str] = None
    service: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    responsable: Optional[str] = None
    comisionista: Optional[str] = None
    comision_tipo: Optional[ComisionTipo] = None
    comision_valor: Optional[Decimal] = None
    status: Optional[ClientStatus] = None
    payment_type: Optional[PaymentType] = None
    project_start_date: Optional[date] = None
    project_amount: Optional[Decimal] = None
    payments: Optional[list[ClientPaymentInput]] = None

    @model_validator(mode="after")
    def _commission(self):
        _check_commission(self.comision_tipo, self.comision_valor)
        return self


class ClientResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    industry: Optional[str] = None
    service: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    responsable: str
    comisionista: Optional[str] = None
    comision_tipo: Optional[ComisionTipo] = None
    comision_valor: Optional[Decimal] = None
    status: ClientStatus
    payment_type: Optional[PaymentType] = None
    project_start_date: Optional[date] = None
    project_amount: Optional[Decimal] = None
    converted_from_prospect_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    payments: list[ClientPaymentResponse] = []

    model_config = {"from_attributes": True}


class ClientListItem(BaseModel):
    id: int
    name: str
    company: Optional[str] = None
    industry: Optional[str] = None
    responsable: str
    status: ClientStatus
    project_amount: Optional[Decimal] = None
    project_start_date: Optional[date] = None
    paid_total: Decimal = Decimal("0")
    created_at: datetime

    model_config = {"from_attributes": True}


class ClientPage(BaseModel):
    items: list[ClientListItem]
    total: int


class ClientStats(BaseModel):
    total: int
    by_status: dict[str, int]
    contratado_total: Decimal
    cobrado_total: Decimal
