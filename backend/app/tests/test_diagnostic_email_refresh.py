import app.routers.diagnostics as diag
from app.tests.conftest import TestingSessionLocal
from app.models.diagnostic_submission import DiagnosticSubmission


def _make(**overrides) -> int:
    db = TestingSessionLocal()
    try:
        row = DiagnosticSubmission(
            name="A", email="a@example.com", locale="es",
            raw_answers_json={}, normalized_answers_en_json={}, service_scores_json={},
            recommended_primary_service="process_automation", llm_status="ok",
            email_delivery_status="sent", email_provider_id="pid-1",
        )
        for k, v in overrides.items():
            setattr(row, k, v)
        db.add(row)
        db.commit()
        db.refresh(row)
        return row.id
    finally:
        db.close()


def test_refresh_updates_non_terminal_rows(auth_client, monkeypatch):
    sid = _make()
    monkeypatch.setattr(diag, "fetch_delivery_status", lambda pid, timeout=None: "delivered")
    monkeypatch.setattr(diag.time, "sleep", lambda *_: None)

    res = auth_client.post("/api/diagnostics/submissions/refresh-email-status")
    assert res.status_code == 200
    item = next(i for i in res.json() if i["id"] == sid)
    assert item["email_delivery_status"] == "delivered"


def test_refresh_skips_terminal_and_idless_rows(auth_client, monkeypatch):
    _make(email_delivery_status="bounced")                       # terminal
    _make(email_provider_id=None, email_delivery_status="sent")  # no provider id
    calls = []
    monkeypatch.setattr(diag, "fetch_delivery_status", lambda pid, timeout=None: calls.append(pid) or "delivered")
    monkeypatch.setattr(diag.time, "sleep", lambda *_: None)

    auth_client.post("/api/diagnostics/submissions/refresh-email-status")
    assert calls == []


def test_refresh_keeps_status_when_lookup_returns_none(auth_client, monkeypatch):
    sid = _make()
    monkeypatch.setattr(diag, "fetch_delivery_status", lambda pid, timeout=None: None)
    monkeypatch.setattr(diag.time, "sleep", lambda *_: None)
    res = auth_client.post("/api/diagnostics/submissions/refresh-email-status")
    item = next(i for i in res.json() if i["id"] == sid)
    assert item["email_delivery_status"] == "sent"


def test_refresh_persists_to_db_and_handles_bounce(auth_client, monkeypatch):
    sid = _make()
    monkeypatch.setattr(diag, "fetch_delivery_status", lambda pid, timeout=None: "bounced")
    monkeypatch.setattr(diag.time, "sleep", lambda *_: None)
    auth_client.post("/api/diagnostics/submissions/refresh-email-status")

    db = TestingSessionLocal()
    try:
        row = db.query(DiagnosticSubmission).filter(DiagnosticSubmission.id == sid).first()
        assert row.email_delivery_status == "bounced"
    finally:
        db.close()


def test_refresh_caps_batch_and_sleeps_between_only(auth_client, monkeypatch):
    for _ in range(18):
        _make()
    checked = []
    sleeps = []
    monkeypatch.setattr(diag, "fetch_delivery_status", lambda pid, timeout=None: checked.append(pid))
    monkeypatch.setattr(diag.time, "sleep", lambda *_: sleeps.append(1))

    auth_client.post("/api/diagnostics/submissions/refresh-email-status")
    assert len(checked) == 15          # _EMAIL_REFRESH_BATCH cap
    assert len(sleeps) == 14           # sleep between iterations only, not after the last


def test_refresh_requires_admin(non_admin_client):
    assert non_admin_client.post(
        "/api/diagnostics/submissions/refresh-email-status"
    ).status_code == 403


def test_dispatch_stores_provider_id(monkeypatch):
    monkeypatch.setattr(diag, "SessionLocal", TestingSessionLocal)

    db = TestingSessionLocal()
    try:
        row = DiagnosticSubmission(
            name="A", email="a@example.com", locale="es",
            raw_answers_json={}, normalized_answers_en_json={}, service_scores_json={},
            recommended_primary_service="process_automation", llm_status="ok",
            email_delivery_status="pending",
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        sid = row.id
    finally:
        db.close()

    monkeypatch.setattr(diag, "send_diagnostic_result_email", lambda **kw: "pid-xyz")
    monkeypatch.setattr(diag, "send_diagnostic_notification_email", lambda *a, **k: None)

    diag._dispatch_diagnostic_emails(sid, {"headline": "h"}, [])

    db = TestingSessionLocal()
    try:
        refreshed = db.query(DiagnosticSubmission).filter(DiagnosticSubmission.id == sid).first()
        assert refreshed.email_delivery_status == "sent"
        assert refreshed.email_provider_id == "pid-xyz"
    finally:
        db.close()


def test_dispatch_marks_failed_without_provider_id(monkeypatch):
    monkeypatch.setattr(diag, "SessionLocal", TestingSessionLocal)

    db = TestingSessionLocal()
    try:
        row = DiagnosticSubmission(
            name="B", email="b@example.com", locale="es",
            raw_answers_json={}, normalized_answers_en_json={}, service_scores_json={},
            recommended_primary_service="process_automation", llm_status="ok",
            email_delivery_status="pending",
        )
        db.add(row); db.commit(); db.refresh(row)
        sid = row.id
    finally:
        db.close()

    def boom(**kw):
        raise RuntimeError("resend down")

    monkeypatch.setattr(diag, "send_diagnostic_result_email", boom)
    monkeypatch.setattr(diag, "send_diagnostic_notification_email", lambda *a, **k: None)

    diag._dispatch_diagnostic_emails(sid, {"headline": "h"}, [])

    db = TestingSessionLocal()
    try:
        refreshed = db.query(DiagnosticSubmission).filter(DiagnosticSubmission.id == sid).first()
        assert refreshed.email_delivery_status == "failed"
        assert refreshed.email_provider_id is None
    finally:
        db.close()
