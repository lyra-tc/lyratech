# backend/app/schemas/revenue.py
from decimal import Decimal

from pydantic import BaseModel


class RevenueMonth(BaseModel):
    month: str  # "YYYY-MM"
    total: Decimal
    segments: dict[str, Decimal]


class RevenueKpis(BaseModel):
    period_total: Decimal
    current_month_total: Decimal
    monthly_avg: Decimal
    pending_to_collect: Decimal


class RevenueBreakdownRow(BaseModel):
    key: str
    label: str
    total: Decimal


class RevenueResponse(BaseModel):
    months: list[RevenueMonth]
    kpis: RevenueKpis
    breakdown: list[RevenueBreakdownRow]
    group_by: str


class RevenueFilterOptions(BaseModel):
    responsables: list[str]
    services: list[str]
    industries: list[str]
