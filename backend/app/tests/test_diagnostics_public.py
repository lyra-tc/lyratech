from app.config import settings
from app.core.diagnostic_seed import seed_diagnostic_questions
from app.tests.conftest import TestingSessionLocal


def _seed():
    db = TestingSessionLocal()
    try:
        seed_diagnostic_questions(db)
    finally:
        db.close()


VALID_ANSWERS = {
    "main_goal": ["reduce_manual_work"],
    "current_situation": ["have_process_not_working"],
    "main_pain": ["repetitive_manual_tasks"],
    "needs_context_or_rules": ["fixed_rules"],
    "what_first": ["connect_existing_systems"],
    "urgency": ["asap"],
    "tech_team_status": ["technical_team_needs_tools"],
    "project_definition": ["just_exploring"],
}

VALID_SUBMIT_PAYLOAD = {
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "phone": "+52 555 000 0000",
    "company": "Acme",
    "locale": "es",
    "answers": VALID_ANSWERS,
    "turnstile_token": "test-token",
}


def test_list_active_questions_returns_nine_seeded_questions(client):
    _seed()
    response = client.get("/api/diagnostics/questions/active", params={"locale": "es"})
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 9
    assert body[0]["key"] == "main_goal"
    assert body[0]["label"] == "¿Qué quieres lograr principalmente?"


def test_list_active_questions_respects_locale(client):
    _seed()
    response = client.get("/api/diagnostics/questions/active", params={"locale": "en"})
    assert response.json()[0]["label"] == "What do you mainly want to achieve?"


def test_submit_diagnostic_success_with_llm_fallback(client, monkeypatch):
    _seed()
    monkeypatch.setattr(
        "app.routers.diagnostics.verify_turnstile_token", lambda token, remote_ip=None: True
    )
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "")  # forces the fallback path

    response = client.post("/api/diagnostics/submit", json=VALID_SUBMIT_PAYLOAD)
    assert response.status_code == 201
    body = response.json()
    assert body["recommended_service"] == "process_automation"
    assert body["secondary_service"] is None
    assert body["service_scores"]["process_automation"] == 12
    assert "submission_id" in body


def test_submit_diagnostic_turnstile_failure(client, monkeypatch):
    _seed()
    monkeypatch.setattr(
        "app.routers.diagnostics.verify_turnstile_token", lambda token, remote_ip=None: False
    )
    response = client.post("/api/diagnostics/submit", json=VALID_SUBMIT_PAYLOAD)
    assert response.status_code == 400


def test_submit_diagnostic_missing_required_answer_rejected(client, monkeypatch):
    _seed()
    monkeypatch.setattr(
        "app.routers.diagnostics.verify_turnstile_token", lambda token, remote_ip=None: True
    )
    answers = dict(VALID_ANSWERS)
    del answers["main_goal"]
    payload = {**VALID_SUBMIT_PAYLOAD, "answers": answers}
    response = client.post("/api/diagnostics/submit", json=payload)
    assert response.status_code == 422


def test_submit_diagnostic_rate_limited(client, monkeypatch):
    _seed()
    monkeypatch.setattr(
        "app.routers.diagnostics.verify_turnstile_token", lambda token, remote_ip=None: True
    )
    for _ in range(5):
        assert client.post("/api/diagnostics/submit", json=VALID_SUBMIT_PAYLOAD).status_code == 201

    response = client.post("/api/diagnostics/submit", json=VALID_SUBMIT_PAYLOAD)
    assert response.status_code == 429


def test_submit_diagnostic_uses_llm_result_when_available(client, monkeypatch):
    _seed()
    monkeypatch.setattr(
        "app.routers.diagnostics.verify_turnstile_token", lambda token, remote_ip=None: True
    )

    def fake_generate(**kwargs):
        return {
            "headline": "LLM headline",
            "summary": "LLM summary",
            "why_it_fits": "LLM why",
            "key_opportunities": ["A"],
            "suggested_next_steps": ["B"],
            "confidence_note": "note",
            "email_subject": "subj",
            "email_preview": "preview",
            "open_answer_en": "",
        }

    monkeypatch.setattr("app.routers.diagnostics.generate_diagnostic", fake_generate)

    response = client.post("/api/diagnostics/submit", json=VALID_SUBMIT_PAYLOAD)
    assert response.status_code == 201
    assert response.json()["headline"] == "LLM headline"


def test_submit_diagnostic_dispatches_notification_to_configured_recipients(
    client, auth_client, monkeypatch
):
    _seed()
    monkeypatch.setattr(
        "app.routers.diagnostics.verify_turnstile_token", lambda token, remote_ip=None: True
    )
    auth_client.post("/api/notifications/recipients", json={"email": "team@lyratech.com.mx"})

    captured = {}

    def fake_dispatch(submission_id, llm_result, recipient_emails):
        captured["recipient_emails"] = recipient_emails

    monkeypatch.setattr("app.routers.diagnostics._dispatch_diagnostic_emails", fake_dispatch)

    response = client.post("/api/diagnostics/submit", json=VALID_SUBMIT_PAYLOAD)
    assert response.status_code == 201
    assert captured["recipient_emails"] == ["team@lyratech.com.mx"]


def test_submit_diagnostic_dispatches_with_empty_list_when_no_recipients_configured(
    client, monkeypatch
):
    _seed()
    monkeypatch.setattr(
        "app.routers.diagnostics.verify_turnstile_token", lambda token, remote_ip=None: True
    )
    captured = {}

    def fake_dispatch(submission_id, llm_result, recipient_emails):
        captured["recipient_emails"] = recipient_emails

    monkeypatch.setattr("app.routers.diagnostics._dispatch_diagnostic_emails", fake_dispatch)

    response = client.post("/api/diagnostics/submit", json=VALID_SUBMIT_PAYLOAD)
    assert response.status_code == 201
    assert captured["recipient_emails"] == []
