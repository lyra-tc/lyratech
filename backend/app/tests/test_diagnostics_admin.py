from app.core.diagnostic_seed import seed_diagnostic_questions
from app.tests.conftest import TestingSessionLocal


def _seed():
    db = TestingSessionLocal()
    try:
        seed_diagnostic_questions(db)
    finally:
        db.close()


QUESTION_PAYLOAD = {
    "key": "test_question",
    "type": "single_choice",
    "sort_order": 100,
    "is_active": True,
    "is_required": True,
    "config_json": {
        "labels": {
            "es": "¿Pregunta de prueba?",
            "en": "Test question?",
            "fr": "Question de test ?",
            "de": "Testfrage?",
        },
        "placeholder": {"es": "", "en": "", "fr": "", "de": ""},
        "help_text": {"es": "", "en": "", "fr": "", "de": ""},
        "options": [
            {
                "value": "option_a",
                "labels": {"es": "Opción A", "en": "Option A", "fr": "Option A", "de": "Option A"},
                "score_weights": {
                    "process_automation": 1,
                    "fixed_price_project": 0,
                    "dedicated_team": 0,
                },
            }
        ],
    },
}

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


def test_list_questions_requires_auth(client):
    assert client.get("/api/diagnostics/questions").status_code == 403


def test_create_question_requires_auth(client):
    assert client.post("/api/diagnostics/questions", json=QUESTION_PAYLOAD).status_code == 403


def test_update_question_requires_auth(client):
    assert client.put("/api/diagnostics/questions/1", json={"is_active": False}).status_code == 403


def test_reorder_questions_requires_auth(client):
    assert client.patch("/api/diagnostics/questions/reorder", json={"ordered_ids": []}).status_code == 403


def test_create_and_list_questions(auth_client):
    create_res = auth_client.post("/api/diagnostics/questions", json=QUESTION_PAYLOAD)
    assert create_res.status_code == 201
    assert create_res.json()["key"] == "test_question"

    list_res = auth_client.get("/api/diagnostics/questions")
    assert list_res.status_code == 200
    assert "test_question" in [q["key"] for q in list_res.json()]


def test_create_question_duplicate_key_rejected(auth_client):
    auth_client.post("/api/diagnostics/questions", json=QUESTION_PAYLOAD)
    response = auth_client.post("/api/diagnostics/questions", json=QUESTION_PAYLOAD)
    assert response.status_code == 409


def test_update_question(auth_client):
    question_id = auth_client.post("/api/diagnostics/questions", json=QUESTION_PAYLOAD).json()["id"]

    update_res = auth_client.put(
        f"/api/diagnostics/questions/{question_id}", json={"is_active": False}
    )
    assert update_res.status_code == 200
    assert update_res.json()["is_active"] is False


def test_update_question_not_found(auth_client):
    response = auth_client.put("/api/diagnostics/questions/9999", json={"is_active": False})
    assert response.status_code == 404


def test_reorder_questions(auth_client):
    first = auth_client.post("/api/diagnostics/questions", json=QUESTION_PAYLOAD).json()
    second_payload = {**QUESTION_PAYLOAD, "key": "test_question_2", "sort_order": 101}
    second = auth_client.post("/api/diagnostics/questions", json=second_payload).json()

    reorder_res = auth_client.patch(
        "/api/diagnostics/questions/reorder",
        json={"ordered_ids": [second["id"], first["id"]]},
    )
    assert reorder_res.status_code == 204

    by_id = {q["id"]: q for q in auth_client.get("/api/diagnostics/questions").json()}
    assert by_id[second["id"]]["sort_order"] == 0
    assert by_id[first["id"]]["sort_order"] == 1


def test_list_submissions_requires_auth(client):
    assert client.get("/api/diagnostics/submissions").status_code == 403


def test_get_submission_requires_auth(client):
    assert client.get("/api/diagnostics/submissions/1").status_code == 403


def test_delete_submission_requires_auth(client):
    assert client.delete("/api/diagnostics/submissions/1").status_code == 403


def test_get_submission_not_found(auth_client):
    assert auth_client.get("/api/diagnostics/submissions/9999").status_code == 404


def test_delete_submission_not_found(auth_client):
    assert auth_client.delete("/api/diagnostics/submissions/9999").status_code == 404


def test_list_and_get_submission_after_submit(client, auth_client, monkeypatch):
    _seed()
    monkeypatch.setattr(
        "app.routers.diagnostics.verify_turnstile_token", lambda token, remote_ip=None: True
    )
    submission_id = client.post(
        "/api/diagnostics/submit", json=VALID_SUBMIT_PAYLOAD
    ).json()["submission_id"]

    list_res = auth_client.get("/api/diagnostics/submissions")
    assert any(item["id"] == submission_id for item in list_res.json())

    detail_res = auth_client.get(f"/api/diagnostics/submissions/{submission_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["name"] == "Ada Lovelace"
    assert detail_res.json()["recommended_primary_service"] == "process_automation"


def test_search_submissions_by_company(client, auth_client, monkeypatch):
    _seed()
    monkeypatch.setattr(
        "app.routers.diagnostics.verify_turnstile_token", lambda token, remote_ip=None: True
    )
    client.post("/api/diagnostics/submit", json=VALID_SUBMIT_PAYLOAD)

    assert len(auth_client.get("/api/diagnostics/submissions", params={"search": "Acme"}).json()) == 1
    assert len(auth_client.get("/api/diagnostics/submissions", params={"search": "Nonexistent"}).json()) == 0


def test_delete_submission(client, auth_client, monkeypatch):
    _seed()
    monkeypatch.setattr(
        "app.routers.diagnostics.verify_turnstile_token", lambda token, remote_ip=None: True
    )
    submission_id = client.post(
        "/api/diagnostics/submit", json=VALID_SUBMIT_PAYLOAD
    ).json()["submission_id"]

    assert auth_client.delete(f"/api/diagnostics/submissions/{submission_id}").status_code == 204
    assert auth_client.get(f"/api/diagnostics/submissions/{submission_id}").status_code == 404
