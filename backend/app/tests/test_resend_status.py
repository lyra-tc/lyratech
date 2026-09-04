from app.core import resend_status
from app.config import settings


class FakeResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {}

    def json(self):
        return self._payload


def _patch_get(monkeypatch, response=None, exc=None):
    def fake_get(url, headers=None, timeout=None):
        if exc:
            raise exc
        return response
    monkeypatch.setattr(resend_status.httpx, "get", fake_get)


def test_returns_none_without_api_key(monkeypatch):
    monkeypatch.setattr(settings, "RESEND_API_KEY", "")
    assert resend_status.fetch_delivery_status("abc") is None


def test_returns_none_without_email_id(monkeypatch):
    monkeypatch.setattr(settings, "RESEND_API_KEY", "k")
    assert resend_status.fetch_delivery_status("") is None


def test_maps_known_events(monkeypatch):
    monkeypatch.setattr(settings, "RESEND_API_KEY", "k")
    for event, expected in [
        ("delivered", "delivered"),
        ("opened", "delivered"),
        ("clicked", "delivered"),
        ("bounced", "bounced"),
        ("complained", "complained"),
        ("delivery_delayed", "delayed"),
        ("sent", "sent"),
        ("queued", "sent"),
    ]:
        _patch_get(monkeypatch, FakeResponse(200, {"last_event": event}))
        assert resend_status.fetch_delivery_status("abc") == expected


def test_unknown_event_returns_none(monkeypatch):
    monkeypatch.setattr(settings, "RESEND_API_KEY", "k")
    _patch_get(monkeypatch, FakeResponse(200, {"last_event": "scheduled"}))
    assert resend_status.fetch_delivery_status("abc") is None


def test_missing_last_event_returns_none(monkeypatch):
    monkeypatch.setattr(settings, "RESEND_API_KEY", "k")
    _patch_get(monkeypatch, FakeResponse(200, {}))
    assert resend_status.fetch_delivery_status("abc") is None


def test_404_returns_none(monkeypatch):
    monkeypatch.setattr(settings, "RESEND_API_KEY", "k")
    _patch_get(monkeypatch, FakeResponse(404, {}))
    assert resend_status.fetch_delivery_status("abc") is None


def test_network_error_returns_none(monkeypatch):
    import httpx
    monkeypatch.setattr(settings, "RESEND_API_KEY", "k")
    _patch_get(monkeypatch, exc=httpx.HTTPError("boom"))
    assert resend_status.fetch_delivery_status("abc") is None


def test_non_json_body_returns_none(monkeypatch):
    import json as _json

    class BadBody:
        status_code = 200

        def json(self):
            raise _json.JSONDecodeError("no json", "", 0)

    monkeypatch.setattr(settings, "RESEND_API_KEY", "k")
    monkeypatch.setattr(resend_status.httpx, "get", lambda *a, **k: BadBody())
    assert resend_status.fetch_delivery_status("abc") is None


def test_non_object_json_body_returns_none(monkeypatch):
    monkeypatch.setattr(settings, "RESEND_API_KEY", "k")
    _patch_get(monkeypatch, FakeResponse(200, payload=["not", "an", "object"]))
    assert resend_status.fetch_delivery_status("abc") is None


def test_non_string_last_event_returns_none(monkeypatch):
    monkeypatch.setattr(settings, "RESEND_API_KEY", "k")
    _patch_get(monkeypatch, FakeResponse(200, {"last_event": {}}))
    assert resend_status.fetch_delivery_status("abc") is None
