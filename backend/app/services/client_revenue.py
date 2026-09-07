# backend/app/services/client_revenue.py
import csv
import io
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.client import Client, ClientPayment, ClientStatus

_GROUP_COLUMNS = {
    "responsable": Client.responsable,
    "status": Client.status,
    "service": Client.service,
    "industry": Client.industry,
}
GROUP_BY_KEYS = tuple(_GROUP_COLUMNS)
_UNASSIGNED = "Sin asignar"
_VALID_STATUSES = {s.value for s in ClientStatus}


def _money(value) -> Decimal:
    if value is None:
        value = 0
    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def month_range(date_from: date, date_to: date) -> list[str]:
    y, m = date_from.year, date_from.month
    out: list[str] = []
    while (y, m) <= (date_to.year, date_to.month):
        out.append(f"{y:04d}-{m:02d}")
        m += 1
        if m > 12:
            m, y = 1, y + 1
    return out


def _segment_value(row, group_by: str) -> str:
    raw = getattr(row, group_by)
    if raw is None or raw == "":
        return _UNASSIGNED
    return raw.value if hasattr(raw, "value") else str(raw)


def _apply_client_filters(q, responsable, status, service, industry):
    if responsable:
        q = q.filter(Client.responsable == responsable)
    if status and status in _VALID_STATUSES:
        q = q.filter(Client.status == status)
    if service:
        q = q.filter(Client.service == service)
    if industry:
        q = q.filter(Client.industry == industry)
    return q


def _paid_in_range(date_from, date_to):
    return (
        ClientPayment.is_paid.is_(True),
        ClientPayment.paid_date.isnot(None),
        ClientPayment.paid_date >= date_from,
        ClientPayment.paid_date <= date_to,
    )


def _paid_rows(db: Session, *, date_from, date_to, responsable, status, service, industry):
    """ClientPayment rows (joined to Client) that are paid within the range and pass client filters."""
    q = (
        db.query(
            ClientPayment.amount.label("amount"),
            ClientPayment.paid_date.label("paid_date"),
            Client.responsable.label("responsable"),
            Client.status.label("status"),
            Client.service.label("service"),
            Client.industry.label("industry"),
        )
        .join(Client, ClientPayment.client_id == Client.id)
        .filter(*_paid_in_range(date_from, date_to))
    )
    q = _apply_client_filters(q, responsable, status, service, industry)
    return q.all()


def compute_revenue(
    db: Session,
    *,
    date_from: date,
    date_to: date,
    responsable: str | None = None,
    status: str | None = None,
    service: str | None = None,
    industry: str | None = None,
    group_by: str = "responsable",
) -> dict:
    if group_by not in GROUP_BY_KEYS:
        raise ValueError("group_by inválido")

    months = month_range(date_from, date_to)
    rows = _paid_rows(
        db, date_from=date_from, date_to=date_to,
        responsable=responsable, status=status, service=service, industry=industry,
    )

    buckets: dict[str, dict[str, Decimal]] = {m: {} for m in months}
    period_by_segment: dict[str, Decimal] = {}
    for r in rows:
        ym = f"{r.paid_date.year:04d}-{r.paid_date.month:02d}"
        if ym not in buckets:
            continue
        seg = _segment_value(r, group_by)
        amt = _money(r.amount)
        buckets[ym][seg] = buckets[ym].get(seg, Decimal("0.00")) + amt
        period_by_segment[seg] = period_by_segment.get(seg, Decimal("0.00")) + amt

    months_out = [
        {
            "month": m,
            "total": sum(buckets[m].values(), Decimal("0.00")),
            "segments": buckets[m],
        }
        for m in months
    ]

    kpis = _kpis(db, months_out, months,
                 responsable, status, service, industry)
    breakdown = [
        {"key": k, "label": k, "total": v}
        for k, v in sorted(period_by_segment.items(), key=lambda kv: (-kv[1], kv[0]))
    ]

    return {
        "months": months_out,
        "kpis": kpis,
        "breakdown": breakdown,
        "group_by": group_by,
    }


def _kpis(db, months_out, months,
          responsable, status, service, industry) -> dict:
    period_total = sum((mo["total"] for mo in months_out), Decimal("0.00"))

    current_ym = date.today().strftime("%Y-%m")
    current_month_total = Decimal("0.00")
    if current_ym in months:
        for mo in months_out:
            if mo["month"] == current_ym:
                current_month_total = mo["total"]
                break

    n_months = max(1, len(months))
    monthly_avg = _money(period_total / n_months)

    pending_q = (
        db.query(func.coalesce(func.sum(ClientPayment.amount), 0))
        .join(Client, ClientPayment.client_id == Client.id)
        .filter(ClientPayment.is_paid.is_(False))
    )
    pending_q = _apply_client_filters(pending_q, responsable, status, service, industry)
    pending_to_collect = _money(pending_q.scalar())

    return {
        "period_total": _money(period_total),
        "current_month_total": _money(current_month_total),
        "monthly_avg": monthly_avg,
        "pending_to_collect": pending_to_collect,
    }


def export_rows(
    db: Session,
    *,
    date_from: date,
    date_to: date,
    responsable: str | None = None,
    status: str | None = None,
    service: str | None = None,
    industry: str | None = None,
) -> list[dict]:
    q = (
        db.query(
            Client.name.label("cliente"),
            Client.company.label("empresa"),
            Client.responsable.label("responsable"),
            Client.status.label("status"),
            Client.service.label("servicio"),
            Client.industry.label("giro"),
            ClientPayment.concept.label("concepto"),
            ClientPayment.paid_date.label("fecha_pago"),
            ClientPayment.amount.label("monto"),
        )
        .join(Client, ClientPayment.client_id == Client.id)
        .filter(*_paid_in_range(date_from, date_to))
    )
    q = _apply_client_filters(q, responsable, status, service, industry)
    q = q.order_by(ClientPayment.paid_date.asc(), Client.name.asc(), ClientPayment.id.asc())
    out = []
    for r in q.all():
        out.append({
            "cliente": r.cliente or "",
            "empresa": r.empresa or "",
            "responsable": r.responsable or "",
            "estado": r.status.value if hasattr(r.status, "value") else (r.status or ""),
            "servicio": r.servicio or "",
            "giro": r.giro or "",
            "concepto": r.concepto or "",
            "fecha_pago": r.fecha_pago.isoformat(),
            "monto": f"{_money(r.monto):.2f}",
        })
    return out


_EXPORT_HEADERS = ["cliente", "empresa", "responsable", "estado", "servicio", "giro",
                   "concepto", "fecha_pago", "monto"]
_CSV_INJECTION_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def _csv_safe(value: str) -> str:
    """Prefix a leading formula/command char with a quote so spreadsheets don't execute it.
    Note: this also quotes legit strings like '-50% descuento' — acceptable trade-off."""
    if value and value[0] in _CSV_INJECTION_PREFIXES:
        return "'" + value
    return value


def rows_to_csv(rows: list[dict]) -> str:
    """Render export_rows() output as a BOM-prefixed CSV string."""
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=_EXPORT_HEADERS)
    writer.writeheader()
    for row in rows:
        writer.writerow({k: _csv_safe(str(v)) for k, v in row.items()})
    return "﻿" + buf.getvalue()


def filter_options(db: Session) -> dict:
    def _distinct(col) -> list[str]:
        rows = db.query(col).filter(col.isnot(None), col != "").distinct().all()
        return sorted({row[0] for row in rows}, key=str.casefold)

    return {
        "responsables": _distinct(Client.responsable),
        "services": _distinct(Client.service),
        "industries": _distinct(Client.industry),
    }
