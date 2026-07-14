import json

import httpx
import pytest

from app.config import settings
from app.core import openrouter as openrouter_module


def test_generate_diagnostic_raises_when_api_key_missing(monkeypatch):
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "")
    with pytest.raises(openrouter_module.OpenRouterError):
        openrouter_module.generate_diagnostic(
            locale="es",
            normalized_answers={},
            service_scores={"process_automation": 1, "fixed_price_project": 0, "dedicated_team": 0},
            recommended_primary="process_automation",
            recommended_secondary=None,
            automation_approach=None,
        )


def test_generate_diagnostic_posts_expected_payload_and_parses_json_content(monkeypatch):
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "test-key")
    monkeypatch.setattr(settings, "OPENROUTER_MODEL", "openai/gpt-4o-mini")
    monkeypatch.setattr(settings, "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    captured = {}

    expected_content = {
        "headline": "Test headline",
        "summary": "Test summary",
        "why_it_fits": "Test why it fits",
        "key_opportunities": ["Test opportunity"],
        "suggested_next_steps": ["Test next step"],
    }

    class FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {
                "choices": [
                    {"message": {"content": json.dumps(expected_content)}}
                ]
            }

    def fake_post(url, json, headers, timeout):
        captured["url"] = url
        captured["json"] = json
        captured["headers"] = headers
        return FakeResponse()

    monkeypatch.setattr(openrouter_module.httpx, "post", fake_post)

    result = openrouter_module.generate_diagnostic(
        locale="es",
        normalized_answers={"main_goal": ["reduce_manual_work"]},
        service_scores={"process_automation": 3, "fixed_price_project": 0, "dedicated_team": 0},
        recommended_primary="process_automation",
        recommended_secondary=None,
        automation_approach="traditional",
    )

    assert result == expected_content
    assert captured["url"] == "https://openrouter.ai/api/v1/chat/completions"
    assert captured["headers"]["Authorization"] == "Bearer test-key"
    assert captured["json"]["model"] == "openai/gpt-4o-mini"
    assert captured["json"]["response_format"] == {"type": "json_object"}


def test_generate_diagnostic_raises_on_http_error(monkeypatch):
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "test-key")

    def fake_post(*a, **k):
        raise httpx.HTTPError("boom")

    monkeypatch.setattr(openrouter_module.httpx, "post", fake_post)

    with pytest.raises(openrouter_module.OpenRouterError):
        openrouter_module.generate_diagnostic(
            locale="es",
            normalized_answers={},
            service_scores={"process_automation": 1, "fixed_price_project": 0, "dedicated_team": 0},
            recommended_primary="process_automation",
            recommended_secondary=None,
            automation_approach=None,
        )


def test_generate_diagnostic_raises_on_malformed_json_content(monkeypatch):
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "test-key")

    class FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"choices": [{"message": {"content": "not valid json"}}]}

    monkeypatch.setattr(openrouter_module.httpx, "post", lambda *a, **k: FakeResponse())

    with pytest.raises(openrouter_module.OpenRouterError):
        openrouter_module.generate_diagnostic(
            locale="es",
            normalized_answers={},
            service_scores={"process_automation": 1, "fixed_price_project": 0, "dedicated_team": 0},
            recommended_primary="process_automation",
            recommended_secondary=None,
            automation_approach=None,
        )


def test_generate_diagnostic_raises_on_empty_choices(monkeypatch):
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "test-key")

    class FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"choices": []}

    monkeypatch.setattr(openrouter_module.httpx, "post", lambda *a, **k: FakeResponse())

    with pytest.raises(openrouter_module.OpenRouterError):
        openrouter_module.generate_diagnostic(
            locale="es",
            normalized_answers={},
            service_scores={"process_automation": 1, "fixed_price_project": 0, "dedicated_team": 0},
            recommended_primary="process_automation",
            recommended_secondary=None,
            automation_approach=None,
        )


def test_generate_diagnostic_raises_on_null_message(monkeypatch):
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "test-key")

    class FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"choices": [{"message": None}]}

    monkeypatch.setattr(openrouter_module.httpx, "post", lambda *a, **k: FakeResponse())

    with pytest.raises(openrouter_module.OpenRouterError):
        openrouter_module.generate_diagnostic(
            locale="es",
            normalized_answers={},
            service_scores={"process_automation": 1, "fixed_price_project": 0, "dedicated_team": 0},
            recommended_primary="process_automation",
            recommended_secondary=None,
            automation_approach=None,
        )


def test_generate_diagnostic_raises_on_empty_required_field(monkeypatch):
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "test-key")

    class FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "headline": "",
                                    "summary": "x",
                                    "why_it_fits": "x",
                                    "key_opportunities": ["x"],
                                    "suggested_next_steps": ["x"],
                                }
                            )
                        }
                    }
                ]
            }

    monkeypatch.setattr(openrouter_module.httpx, "post", lambda *a, **k: FakeResponse())

    with pytest.raises(openrouter_module.OpenRouterError):
        openrouter_module.generate_diagnostic(
            locale="es",
            normalized_answers={},
            service_scores={"process_automation": 1, "fixed_price_project": 0, "dedicated_team": 0},
            recommended_primary="process_automation",
            recommended_secondary=None,
            automation_approach=None,
        )


def test_generate_diagnostic_raises_on_empty_list_field(monkeypatch):
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "test-key")

    class FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "headline": "x",
                                    "summary": "x",
                                    "why_it_fits": "x",
                                    "key_opportunities": [],
                                    "suggested_next_steps": ["x"],
                                }
                            )
                        }
                    }
                ]
            }

    monkeypatch.setattr(openrouter_module.httpx, "post", lambda *a, **k: FakeResponse())

    with pytest.raises(openrouter_module.OpenRouterError):
        openrouter_module.generate_diagnostic(
            locale="es",
            normalized_answers={},
            service_scores={"process_automation": 1, "fixed_price_project": 0, "dedicated_team": 0},
            recommended_primary="process_automation",
            recommended_secondary=None,
            automation_approach=None,
        )


def test_build_fallback_result_uses_localized_service_name():
    result = openrouter_module.build_fallback_result(locale="es", recommended_primary="dedicated_team")
    assert "Equipo Dedicado" in result["summary"]
    assert result["open_answer_en"] == ""


def test_build_fallback_result_defaults_to_english_for_unknown_locale():
    result = openrouter_module.build_fallback_result(locale="pt", recommended_primary="fixed_price_project")
    assert "Fixed-Price Project" in result["summary"]
