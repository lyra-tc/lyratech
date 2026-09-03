from app.tests.conftest import TestingSessionLocal
from app.models.diagnostic_submission import DiagnosticSubmission


def _make_submission(**overrides) -> int:
    db = TestingSessionLocal()
    try:
        row = DiagnosticSubmission(
            name="Ada Lovelace",
            email="ada@example.com",
            phone="+52 555 000 0000",
            company="Acme",
            locale="es",
            raw_answers_json={},
            normalized_answers_en_json={},
            service_scores_json={},
            recommended_primary_service="process_automation",
            llm_status="ok",
            email_delivery_status="pending",
            **overrides,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row.id
    finally:
        db.close()


def test_list_and_detail_include_conversion_status(auth_client):
    sid = _make_submission()
    item = next(
        i for i in auth_client.get("/api/diagnostics/submissions").json() if i["id"] == sid
    )
    assert item["conversion_status"] == "pending"
    assert item["converted_prospect_id"] is None
    detail = auth_client.get(f"/api/diagnostics/submissions/{sid}").json()
    assert detail["conversion_status"] == "pending"


def test_list_submissions_filters_by_conversion(auth_client):
    pending_id = _make_submission()
    converted_id = _make_submission(conversion_status="prospect")

    ids = [i["id"] for i in auth_client.get(
        "/api/diagnostics/submissions", params={"conversion": "prospect"}
    ).json()]
    assert converted_id in ids and pending_id not in ids

    ids_all = [i["id"] for i in auth_client.get("/api/diagnostics/submissions").json()]
    assert pending_id in ids_all and converted_id in ids_all


def test_list_submissions_ignores_unknown_conversion_value(auth_client):
    sid = _make_submission()
    ids = [i["id"] for i in auth_client.get(
        "/api/diagnostics/submissions", params={"conversion": "garbage"}
    ).json()]
    assert sid in ids


def _create_prospect(auth_client, **overrides) -> int:
    payload = {"name": "Ada Lovelace", "email": "ada@example.com", "source": "Web"}
    payload.update(overrides)
    return auth_client.post("/api/prospects/", json=payload).json()["id"]


def test_mark_converted_sets_prospect_status(auth_client):
    sid = _make_submission()
    pid = _create_prospect(auth_client)
    res = auth_client.post(
        f"/api/diagnostics/submissions/{sid}/mark-converted", json={"prospect_id": pid}
    )
    assert res.status_code == 200
    body = res.json()
    assert body["conversion_status"] == "prospect"
    assert body["converted_prospect_id"] == pid

    from app.models.diagnostic_submission import DiagnosticSubmission
    db = TestingSessionLocal()
    try:
        row = db.query(DiagnosticSubmission).filter(DiagnosticSubmission.id == sid).first()
        assert row.converted_at is not None
    finally:
        db.close()


def test_mark_converted_lost_when_prospect_is_lost(auth_client):
    sid = _make_submission()
    pid = _create_prospect(auth_client, status="lost")
    res = auth_client.post(
        f"/api/diagnostics/submissions/{sid}/mark-converted", json={"prospect_id": pid}
    )
    assert res.status_code == 200
    assert res.json()["conversion_status"] == "lost"


def test_mark_converted_rejects_second_conversion(auth_client):
    sid = _make_submission()
    first_pid = _create_prospect(auth_client)
    auth_client.post(
        f"/api/diagnostics/submissions/{sid}/mark-converted", json={"prospect_id": first_pid}
    )
    second_pid = _create_prospect(auth_client, name="Other")
    again = auth_client.post(
        f"/api/diagnostics/submissions/{sid}/mark-converted", json={"prospect_id": second_pid}
    )
    assert again.status_code == 409
    detail = auth_client.get(f"/api/diagnostics/submissions/{sid}").json()
    assert detail["converted_prospect_id"] == first_pid


def test_mark_converted_missing_submission(auth_client):
    pid = _create_prospect(auth_client)
    assert auth_client.post(
        "/api/diagnostics/submissions/9999/mark-converted", json={"prospect_id": pid}
    ).status_code == 404


def test_mark_converted_missing_prospect(auth_client):
    sid = _make_submission()
    assert auth_client.post(
        f"/api/diagnostics/submissions/{sid}/mark-converted", json={"prospect_id": 9999}
    ).status_code == 404


def test_mark_converted_requires_admin(non_admin_client):
    assert non_admin_client.post(
        "/api/diagnostics/submissions/1/mark-converted", json={"prospect_id": 1}
    ).status_code == 403
