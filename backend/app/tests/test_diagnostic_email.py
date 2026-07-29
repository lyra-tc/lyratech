from app.core import email as email_module
from app.config import settings
from app.models.diagnostic_submission import DiagnosticSubmission


def _make_submission(**overrides):
    defaults = dict(
        id=1,
        name="Ada Lovelace",
        email="ada@example.com",
        phone="+52 555 000 0000",
        company="Acme",
        locale="es",
        recommended_primary_service="process_automation",
        recommended_secondary_service=None,
    )
    defaults.update(overrides)
    return DiagnosticSubmission(**defaults)


def test_build_notification_html_includes_submission_fields():
    html = email_module.build_diagnostic_notification_html(_make_submission())
    assert "Ada Lovelace" in html
    assert "ada@example.com" in html
    assert "Process Automation" in html


def test_build_notification_html_includes_secondary_service_when_present():
    html = email_module.build_diagnostic_notification_html(
        _make_submission(recommended_secondary_service="dedicated_team")
    )
    assert "Dedicated Team" in html


def test_send_notification_skips_when_no_recipients(monkeypatch):
    calls = []
    monkeypatch.setattr(email_module.httpx, "post", lambda *a, **k: calls.append((a, k)))
    monkeypatch.setattr(settings, "RESEND_API_KEY", "test-key")
    email_module.send_diagnostic_notification_email(_make_submission(), [])
    assert calls == []


def test_send_notification_swallows_http_errors(monkeypatch):
    import httpx as httpx_module

    def fake_post(*a, **k):
        raise httpx_module.HTTPError("boom")

    monkeypatch.setattr(email_module.httpx, "post", fake_post)
    monkeypatch.setattr(settings, "RESEND_API_KEY", "test-key")

    email_module.send_diagnostic_notification_email(
        _make_submission(), ["team@lyratech.com.mx"]
    )  # must not raise


def test_send_notification_posts_expected_payload(monkeypatch):
    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            pass

    def fake_post(url, json, headers, timeout):
        captured["json"] = json
        return FakeResponse()

    monkeypatch.setattr(email_module.httpx, "post", fake_post)
    monkeypatch.setattr(settings, "RESEND_API_KEY", "test-key")

    email_module.send_diagnostic_notification_email(
        _make_submission(), ["team@lyratech.com.mx"]
    )

    assert captured["json"]["to"] == ["team@lyratech.com.mx"]
    assert captured["json"]["reply_to"] == "ada@example.com"
    assert "Ada Lovelace" in captured["json"]["subject"]


def test_build_result_email_html_includes_llm_fields():
    llm_result = {
        "headline": "Estás listo para automatizar",
        "summary": "Resumen de prueba",
        "why_it_fits": "Por que aplica",
        "key_opportunities": ["Oportunidad 1", "Oportunidad 2"],
        "suggested_next_steps": ["Paso 1"],
        "email_preview": "Vista previa",
    }
    html = email_module.build_diagnostic_result_email_html(
        locale="es", llm_result=llm_result, submission_name="Ada"
    )
    assert "Estás listo para automatizar" in html
    assert "Oportunidad 1" in html
    assert "Paso 1" in html


def test_send_result_email_raises_when_api_key_missing(monkeypatch):
    monkeypatch.setattr(settings, "RESEND_API_KEY", "")
    raised = False
    try:
        email_module.send_diagnostic_result_email(
            to_email="ada@example.com",
            locale="es",
            llm_result={
                "headline": "h", "summary": "s", "why_it_fits": "w",
                "key_opportunities": [], "suggested_next_steps": [],
            },
            submission_name="Ada",
        )
    except RuntimeError:
        raised = True
    assert raised


def test_send_result_email_posts_with_llm_subject(monkeypatch):
    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            pass

    def fake_post(url, json, headers, timeout):
        captured["json"] = json
        return FakeResponse()

    monkeypatch.setattr(email_module.httpx, "post", fake_post)
    monkeypatch.setattr(settings, "RESEND_API_KEY", "test-key")

    email_module.send_diagnostic_result_email(
        to_email="ada@example.com",
        locale="es",
        llm_result={
            "headline": "h", "summary": "s", "why_it_fits": "w",
            "key_opportunities": [], "suggested_next_steps": [],
            "email_subject": "Tu diagnostico personalizado",
        },
        submission_name="Ada",
    )

    assert captured["json"]["to"] == ["ada@example.com"]
    assert captured["json"]["subject"] == "Tu diagnostico personalizado"
