# backend/app/tests/test_client_revenue.py
from datetime import date
from decimal import Decimal

from app.models.client import Client, ClientPayment, ClientStatus
from app.services.client_revenue import (
    compute_revenue,
    export_rows,
    filter_options,
    month_range,
)
from app.tests.conftest import TestingSessionLocal


def _client(responsable="Ana", status=ClientStatus.nuevo, service="Auto", industry="Retail",
            name="C", company="Co"):
    db = TestingSessionLocal()
    try:
        c = Client(name=name, company=company, responsable=responsable, status=status,
                   service=service, industry=industry)
        db.add(c)
        db.commit()
        db.refresh(c)
        return c.id
    finally:
        db.close()


def _pay(client_id, paid_date, amount, is_paid=True, due_date=None, concept="P"):
    db = TestingSessionLocal()
    try:
        db.add(ClientPayment(
            client_id=client_id,
            due_date=due_date or paid_date or date(2026, 1, 1),
            concept=concept,
            amount=Decimal(amount),
            is_paid=is_paid,
            paid_date=paid_date,
        ))
        db.commit()
    finally:
        db.close()


def _rev(**kw):
    kw.setdefault("date_from", date(2026, 1, 1))
    kw.setdefault("date_to", date(2026, 3, 31))
    db = TestingSessionLocal()
    try:
        return compute_revenue(db, **kw)
    finally:
        db.close()


def test_month_range_inclusive():
    assert month_range(date(2026, 1, 15), date(2026, 3, 2)) == ["2026-01", "2026-02", "2026-03"]
    assert month_range(date(2026, 5, 1), date(2026, 5, 31)) == ["2026-05"]
    assert month_range(date(2025, 11, 1), date(2026, 2, 1)) == [
        "2025-11", "2025-12", "2026-01", "2026-02",
    ]


def test_only_paid_payments_count_bucketed_by_paid_date(auth_client):
    cid = _client(responsable="Ana")
    _pay(cid, date(2026, 1, 10), "1000")
    _pay(cid, date(2026, 1, 20), "500")
    _pay(cid, date(2026, 2, 5), "2000")
    _pay(cid, date(2026, 2, 15), "300", is_paid=False)  # ignored
    out = _rev(group_by="responsable")
    by_month = {m["month"]: m for m in out["months"]}
    assert [m["month"] for m in out["months"]] == ["2026-01", "2026-02", "2026-03"]
    assert by_month["2026-01"]["total"] == Decimal("1500.00")
    assert by_month["2026-02"]["total"] == Decimal("2000.00")
    assert by_month["2026-03"]["total"] == Decimal("0.00")
    assert by_month["2026-03"]["segments"] == {}


def test_segments_sum_to_month_total(auth_client):
    a = _client(responsable="Ana")
    b = _client(responsable="Luis")
    _pay(a, date(2026, 1, 10), "1000")
    _pay(b, date(2026, 1, 12), "400")
    out = _rev(group_by="responsable")
    jan = next(m for m in out["months"] if m["month"] == "2026-01")
    assert jan["segments"] == {"Ana": Decimal("1000.00"), "Luis": Decimal("400.00")}
    assert sum(jan["segments"].values(), Decimal("0.00")) == jan["total"]


def test_group_by_status_and_null_label(auth_client):
    a = _client(status=ClientStatus.cerrado, service=None)
    _pay(a, date(2026, 1, 10), "1000")
    out_status = _rev(group_by="status")
    jan = next(m for m in out_status["months"] if m["month"] == "2026-01")
    assert jan["segments"] == {"cerrado": Decimal("1000.00")}
    out_service = _rev(group_by="service")
    jan_s = next(m for m in out_service["months"] if m["month"] == "2026-01")
    assert jan_s["segments"] == {"Sin asignar": Decimal("1000.00")}


def test_client_filters_narrow_results(auth_client):
    a = _client(responsable="Ana", service="Auto", industry="Retail", status=ClientStatus.nuevo)
    b = _client(responsable="Luis", service="Consultoria", industry="Manufactura",
                status=ClientStatus.cerrado)
    _pay(a, date(2026, 1, 10), "1000")
    _pay(b, date(2026, 1, 11), "9999")
    assert _rev(responsable="Ana")["kpis"]["period_total"] == Decimal("1000.00")
    assert _rev(status="cerrado")["kpis"]["period_total"] == Decimal("9999.00")
    assert _rev(service="Auto")["kpis"]["period_total"] == Decimal("1000.00")
    assert _rev(industry="Manufactura")["kpis"]["period_total"] == Decimal("9999.00")
    assert _rev(status="banana")["kpis"]["period_total"] == Decimal("10999.00")


def test_breakdown_sorted_desc_and_sums_to_period_total(auth_client):
    a = _client(responsable="Ana")
    b = _client(responsable="Luis")
    _pay(a, date(2026, 1, 10), "300")
    _pay(b, date(2026, 2, 10), "700")
    out = _rev(group_by="responsable")
    assert [r["key"] for r in out["breakdown"]] == ["Luis", "Ana"]
    assert sum((r["total"] for r in out["breakdown"]), Decimal("0.00")) == out["kpis"]["period_total"]


def test_kpis_monthly_avg_and_pending(auth_client):
    a = _client(responsable="Ana")
    _pay(a, date(2026, 1, 10), "3000")
    _pay(a, date(2026, 6, 10), "6000", is_paid=False, due_date=date(2026, 6, 10))
    out = _rev(date_from=date(2026, 1, 1), date_to=date(2026, 3, 31))
    assert out["kpis"]["period_total"] == Decimal("3000.00")
    assert out["kpis"]["monthly_avg"] == Decimal("1000.00")
    assert out["kpis"]["pending_to_collect"] == Decimal("6000.00")


def test_current_month_total_zero_when_out_of_range(auth_client):
    a = _client()
    _pay(a, date(2026, 1, 10), "1000")
    out = _rev(date_from=date(2026, 1, 1), date_to=date(2026, 1, 31))
    assert out["kpis"]["current_month_total"] == Decimal("0.00")


def test_group_by_invalid_raises(auth_client):
    import pytest
    with pytest.raises(ValueError):
        _rev(group_by="nope")


def test_current_month_total_populated_when_in_range(auth_client, monkeypatch):
    import app.services.client_revenue as cr
    a = _client()
    _pay(a, date(2026, 2, 15), "1234.50")

    class _FixedDate(date):
        @classmethod
        def today(cls):
            return date(2026, 2, 20)

    monkeypatch.setattr(cr, "date", _FixedDate)
    out = _rev(date_from=date(2026, 1, 1), date_to=date(2026, 3, 31))
    assert out["kpis"]["current_month_total"] == Decimal("1234.50")


def test_response_serializes_money_as_two_decimal_strings(auth_client):
    from app.schemas.revenue import RevenueResponse
    a = _client(responsable="Ana")
    _pay(a, date(2026, 1, 10), "1000")
    dumped = RevenueResponse.model_validate(_rev(group_by="responsable")).model_dump(mode="json")
    assert dumped["months"][0]["total"] == "1000.00"
    assert dumped["kpis"]["period_total"] == "1000.00"
    assert dumped["breakdown"][0]["total"] == "1000.00"


def test_empty_string_segment_is_unassigned(auth_client):
    a = _client(service="")
    _pay(a, date(2026, 1, 10), "500")
    out = _rev(group_by="service")
    jan = next(m for m in out["months"] if m["month"] == "2026-01")
    assert jan["segments"] == {"Sin asignar": Decimal("500.00")}


def test_empty_period_all_zero(auth_client):
    out = _rev()
    assert out["kpis"] == {
        "period_total": Decimal("0.00"),
        "current_month_total": Decimal("0.00"),
        "monthly_avg": Decimal("0.00"),
        "pending_to_collect": Decimal("0.00"),
    }
    assert out["breakdown"] == []


def test_export_rows_shape_and_order(auth_client):
    a = _client(name="Beta", company="BetaCo", responsable="Ana", status=ClientStatus.nuevo,
                service="Auto", industry="Retail")
    _pay(a, date(2026, 2, 10), "500", concept="Anticipo")
    _pay(a, date(2026, 1, 10), "1500", concept="Enganche")
    _pay(a, date(2026, 3, 10), "999", is_paid=False)  # not exported
    db = TestingSessionLocal()
    try:
        rows = export_rows(db, date_from=date(2026, 1, 1), date_to=date(2026, 3, 31),
                           responsable=None, status=None, service=None, industry=None)
    finally:
        db.close()
    assert [r["concepto"] for r in rows] == ["Enganche", "Anticipo"]  # by paid_date asc
    assert rows[0] == {
        "cliente": "Beta", "empresa": "BetaCo", "responsable": "Ana", "estado": "nuevo",
        "servicio": "Auto", "giro": "Retail", "concepto": "Enganche",
        "fecha_pago": "2026-01-10", "monto": "1500.00",
    }


def test_filter_options_distinct_sorted(auth_client):
    _client(responsable="Zoe", service="B", industry=None)
    _client(responsable="Ana", service="A", industry="Retail")
    _client(responsable="Ana", service=None, industry="Retail")
    db = TestingSessionLocal()
    try:
        opts = filter_options(db)
    finally:
        db.close()
    assert opts["responsables"] == ["Ana", "Zoe"]
    assert opts["services"] == ["A", "B"]
    assert opts["industries"] == ["Retail"]


def test_export_rows_respects_filters_and_range(auth_client):
    a = _client(name="Alpha", responsable="Ana")
    b = _client(name="Bravo", responsable="Luis")
    _pay(a, date(2026, 1, 10), "1234.5", concept="A1")
    _pay(b, date(2026, 1, 11), "500", concept="B1")
    _pay(a, date(2026, 9, 10), "700", concept="OUT")  # outside range
    db = TestingSessionLocal()
    try:
        rows = export_rows(db, date_from=date(2026, 1, 1), date_to=date(2026, 3, 31),
                           responsable="Ana", status=None, service=None, industry=None)
    finally:
        db.close()
    assert [r["concepto"] for r in rows] == ["A1"]      # filtered to Ana, in-range only
    assert rows[0]["monto"] == "1234.50"                 # non-integer formats to 2dp


def test_filter_options_excludes_empty_string(auth_client):
    _client(responsable="Ana", service="", industry="Retail")
    db = TestingSessionLocal()
    try:
        opts = filter_options(db)
    finally:
        db.close()
    assert opts["services"] == []


_RANGE = {"date_from": "2026-01-01", "date_to": "2026-03-31"}


def test_revenue_endpoint_happy_path(auth_client):
    a = _client(responsable="Ana")
    b = _client(responsable="Luis")
    _pay(a, date(2026, 1, 10), "1000")
    _pay(b, date(2026, 2, 10), "400")
    res = auth_client.get("/api/clients/revenue", params={**_RANGE, "group_by": "responsable"})
    assert res.status_code == 200
    body = res.json()
    assert body["group_by"] == "responsable"
    assert [m["month"] for m in body["months"]] == ["2026-01", "2026-02", "2026-03"]
    jan = body["months"][0]
    assert jan["total"] == "1000.00"                 # Decimal -> JSON string
    assert jan["segments"] == {"Ana": "1000.00"}
    assert body["kpis"]["period_total"] == "1400.00"
    assert body["breakdown"][0] == {"key": "Ana", "label": "Ana", "total": "1000.00"}


def test_revenue_endpoint_validation(auth_client):
    assert auth_client.get("/api/clients/revenue",
                           params={"date_from": "2026-05-01", "date_to": "2026-01-01"}).status_code == 422
    assert auth_client.get("/api/clients/revenue",
                           params={**_RANGE, "group_by": "banana"}).status_code == 422
    assert auth_client.get("/api/clients/revenue").status_code == 422  # missing required params


def test_revenue_endpoint_requires_admin(client, non_admin_client):
    assert client.get("/api/clients/revenue", params=_RANGE).status_code == 401
    assert non_admin_client.get("/api/clients/revenue", params=_RANGE).status_code == 403


def test_revenue_endpoint_applies_filters(auth_client):
    a = _client(responsable="Ana")
    b = _client(responsable="Luis")
    _pay(a, date(2026, 1, 10), "1000")
    _pay(b, date(2026, 1, 11), "9999")
    res = auth_client.get("/api/clients/revenue", params={**_RANGE, "responsable": "Ana"})
    assert res.status_code == 200
    assert res.json()["kpis"]["period_total"] == "1000.00"


def test_revenue_filters_endpoint(auth_client, client, non_admin_client):
    _client(responsable="Zoe", service="B", industry="Retail")
    _client(responsable="Ana", service="A", industry="Retail")
    res = auth_client.get("/api/clients/revenue/filters")
    assert res.status_code == 200
    body = res.json()
    assert body["responsables"] == ["Ana", "Zoe"]
    assert body["services"] == ["A", "B"]
    assert body["industries"] == ["Retail"]
    assert client.get("/api/clients/revenue/filters").status_code == 401
    assert non_admin_client.get("/api/clients/revenue/filters").status_code == 403


def test_revenue_export_endpoint(auth_client, client, non_admin_client):
    a = _client(name="Beta", company="BetaCo", responsable="Ana")
    _pay(a, date(2026, 1, 10), "1500", concept="Enganche")
    _pay(a, date(2026, 2, 10), "500", concept="Anticipo")
    res = auth_client.get("/api/clients/revenue/export", params=_RANGE)
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    assert "attachment" in res.headers["content-disposition"]
    assert "ingresos_2026-01-01_2026-03-31.csv" in res.headers["content-disposition"]
    text = res.content.decode("utf-8").lstrip("﻿")
    lines = text.strip().splitlines()
    assert lines[0] == "cliente,empresa,responsable,estado,servicio,giro,concepto,fecha_pago,monto"
    assert lines[1].startswith("Beta,BetaCo,Ana,nuevo,")
    assert lines[1].endswith(",Enganche,2026-01-10,1500.00")
    assert len(lines) == 3  # header + 2 paid payments

    assert auth_client.get("/api/clients/revenue/export",
                           params={"date_from": "2026-05-01", "date_to": "2026-01-01"}).status_code == 422
    assert client.get("/api/clients/revenue/export", params=_RANGE).status_code == 401
    assert non_admin_client.get("/api/clients/revenue/export", params=_RANGE).status_code == 403


def test_revenue_export_sanitizes_formula_injection(auth_client):
    a = _client(name="=SUM(A1:A9)", company="+cmd", responsable="Ana", service="@x", industry="-y")
    _pay(a, date(2026, 1, 10), "100", concept="=1+1")
    res = auth_client.get("/api/clients/revenue/export", params=_RANGE)
    text = res.content.decode("utf-8").lstrip("﻿")
    row = text.strip().splitlines()[1]
    # each field that began with = + - @ must be prefixed with a single quote
    assert row.startswith("'=SUM(A1:A9),'+cmd,Ana,nuevo,'@x,'-y,'=1+1,")


def test_rows_to_csv_sanitizes_and_preserves_safe_values():
    from app.services.client_revenue import rows_to_csv
    rows = [{
        "cliente": "=SUM(1)", "empresa": "Acme", "responsable": "-Ana",
        "estado": "nuevo", "servicio": "", "giro": "@x",
        "concepto": "Normal text", "fecha_pago": "2026-01-10", "monto": "1500.00",
    }]
    out = rows_to_csv(rows).lstrip("﻿")
    header, data = out.strip().splitlines()
    assert header == "cliente,empresa,responsable,estado,servicio,giro,concepto,fecha_pago,monto"
    assert data.startswith("'=SUM(1),Acme,'-Ana,nuevo,,'@x,Normal text,2026-01-10,1500.00")
