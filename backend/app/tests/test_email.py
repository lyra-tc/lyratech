from app.core import email as email_module
from app.config import settings
from app.models.prospect import Prospect


def _make_prospect(**overrides):
    defaults = dict(
        id=1,
        name="Ada Lovelace",
        email="ada@example.com",
        phone="+52 555 000 0000",
        company="Acme",
        service="automatizaciones",
        message="Quiero saber más",
    )
    defaults.update(overrides)
    return Prospect(**defaults)


def test_build_html_includes_prospect_fields():
    html = email_module.build_prospect_notification_html(_make_prospect())
    assert "Ada Lovelace" in html
    assert "ada@example.com" in html
    assert "Acme" in html


def test_build_html_includes_dashboard_link_when_frontend_url_set(monkeypatch):
    monkeypatch.setattr(settings, "FRONTEND_URL", "https://lyratech.com.mx")
    html = email_module.build_prospect_notification_html(_make_prospect())
    assert "https://lyratech.com.mx/dashboard/prospects" in html


def test_build_html_omits_dashboard_link_when_frontend_url_empty(monkeypatch):
    monkeypatch.setattr(settings, "FRONTEND_URL", "")
    html = email_module.build_prospect_notification_html(_make_prospect())
    assert "dashboard/prospects" not in html


def test_build_test_html_includes_notifications_link_when_frontend_url_set(monkeypatch):
    monkeypatch.setattr(settings, "FRONTEND_URL", "https://lyratech.com.mx")
    html = email_module.build_test_notification_html()
    assert "https://lyratech.com.mx/dashboard/notifications" in html


def test_send_skips_when_no_recipients(monkeypatch):
    calls = []
    monkeypatch.setattr(email_module.httpx, "post", lambda *a, **k: calls.append((a, k)))
    monkeypatch.setattr(settings, "RESEND_API_KEY", "test-key")
    email_module.send_prospect_notification_email(_make_prospect(), [])
    assert calls == []


def test_send_skips_when_api_key_missing(monkeypatch):
    calls = []
    monkeypatch.setattr(email_module.httpx, "post", lambda *a, **k: calls.append((a, k)))
    monkeypatch.setattr(settings, "RESEND_API_KEY", "")
    email_module.send_prospect_notification_email(_make_prospect(), ["team@lyratech.com.mx"])
    assert calls == []


def test_send_posts_to_resend_with_expected_payload(monkeypatch):
    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            pass

    def fake_post(url, json, headers, timeout):
        captured["url"] = url
        captured["json"] = json
        captured["headers"] = headers
        return FakeResponse()

    monkeypatch.setattr(email_module.httpx, "post", fake_post)
    monkeypatch.setattr(settings, "RESEND_API_KEY", "test-key")
    monkeypatch.setattr(settings, "NOTIFICATION_FROM_EMAIL", "notificaciones@lyratech.com.mx")
    monkeypatch.setattr(settings, "NOTIFICATION_FROM_NAME", "Lyratech")

    email_module.send_prospect_notification_email(
        _make_prospect(), ["team@lyratech.com.mx"]
    )

    assert captured["url"] == "https://api.resend.com/emails"
    assert captured["json"]["to"] == ["team@lyratech.com.mx"]
    assert captured["json"]["reply_to"] == "ada@example.com"
    assert captured["json"]["from"] == "Lyratech <notificaciones@lyratech.com.mx>"
    assert captured["json"]["subject"] == "Nuevo prospecto: Ada Lovelace"
    assert captured["headers"]["Authorization"] == "Bearer test-key"


def test_send_swallows_http_errors(monkeypatch):
    import httpx as httpx_module

    def fake_post(*a, **k):
        raise httpx_module.HTTPError("boom")

    monkeypatch.setattr(email_module.httpx, "post", fake_post)
    monkeypatch.setattr(settings, "RESEND_API_KEY", "test-key")

    email_module.send_prospect_notification_email(
        _make_prospect(), ["team@lyratech.com.mx"]
    )  # must not raise


def test_send_test_posts_to_resend_with_expected_payload(monkeypatch):
    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            pass

    def fake_post(url, json, headers, timeout):
        captured["url"] = url
        captured["json"] = json
        captured["headers"] = headers
        return FakeResponse()

    monkeypatch.setattr(email_module.httpx, "post", fake_post)
    monkeypatch.setattr(settings, "RESEND_API_KEY", "test-key")
    monkeypatch.setattr(settings, "NOTIFICATION_FROM_EMAIL", "notificaciones@lyratech.com.mx")
    monkeypatch.setattr(settings, "NOTIFICATION_FROM_NAME", "Lyratech")

    email_module.send_test_notification_email("team@lyratech.com.mx")

    assert captured["url"] == "https://api.resend.com/emails"
    assert captured["json"]["to"] == ["team@lyratech.com.mx"]
    assert captured["json"]["from"] == "Lyratech <notificaciones@lyratech.com.mx>"
    assert captured["json"]["subject"] == "Prueba de notificaciones de Lyratech"
    assert captured["headers"]["Authorization"] == "Bearer test-key"


def test_build_html_escapes_html_special_characters():
    prospect = _make_prospect(message="<script>alert(1)</script>")
    html = email_module.build_prospect_notification_html(prospect)
    assert "&lt;script&gt;alert(1)&lt;/script&gt;" in html
    assert "<script>alert(1)</script>" not in html


def test_send_swallows_errors_during_payload_construction(monkeypatch):
    def raise_during_build(*a, **k):
        raise RuntimeError("boom during html build")

    monkeypatch.setattr(
        email_module, "build_prospect_notification_html", raise_during_build
    )
    monkeypatch.setattr(settings, "RESEND_API_KEY", "test-key")

    email_module.send_prospect_notification_email(
        _make_prospect(), ["team@lyratech.com.mx"]
    )  # must not raise
