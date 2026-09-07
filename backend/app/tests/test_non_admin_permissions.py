"""El rol `usuario` (activo, sin is_admin) opera pipeline pero nunca borra.

`non_admin_client` -> User(is_active=True, is_admin=False)
`auth_client`      -> User(is_active=True, is_admin=True)
`client`           -> sin auth (401)
"""

from app.core.lead_import import TEMPLATE_HEADERS
from app.tests.conftest import TestingSessionLocal
from app.models.diagnostic_submission import DiagnosticSubmission


def _make_submission(**overrides) -> int:
    db = TestingSessionLocal()
    try:
        row = DiagnosticSubmission(
            name="Ada Lovelace",
            email="ada@example.com",
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


# --- Prospectos ---------------------------------------------------------------

def test_non_admin_lists_prospects(non_admin_client):
    assert non_admin_client.get("/api/prospects/").status_code == 200


def test_non_admin_reads_prospect_stats(non_admin_client):
    assert non_admin_client.get("/api/prospects/stats").status_code == 200


def test_non_admin_creates_reads_updates_prospect(non_admin_client):
    created = non_admin_client.post(
        "/api/prospects/", json={"name": "NA Ada", "email": "na@example.com", "source": "Web"}
    )
    assert created.status_code == 201
    pid = created.json()["id"]

    assert non_admin_client.get(f"/api/prospects/{pid}").status_code == 200

    updated = non_admin_client.put(f"/api/prospects/{pid}", json={"status": "call_later"})
    assert updated.status_code == 200
    assert updated.json()["status"] == "call_later"


def test_non_admin_cannot_delete_prospect(non_admin_client, auth_client):
    pid = auth_client.post(
        "/api/prospects/", json={"name": "Temp", "source": "Web"}
    ).json()["id"]
    assert non_admin_client.delete(f"/api/prospects/{pid}").status_code == 403


# --- Leads -------------------------------------------------------------------

_CSV_HEADERS = ",".join(TEMPLATE_HEADERS)


def test_non_admin_lists_leads(non_admin_client):
    assert non_admin_client.get("/api/leads/").status_code == 200


def test_non_admin_creates_manual_lead(non_admin_client):
    resp = non_admin_client.post(
        "/api/leads/manual", json={"name": "NA Lead", "email": "nal@example.com"}
    )
    assert resp.status_code == 201


def test_non_admin_updates_lead(non_admin_client):
    lead_id = non_admin_client.post(
        "/api/leads/manual", json={"name": "NA Edit", "phone": "555"}
    ).json()["id"]
    resp = non_admin_client.put(f"/api/leads/{lead_id}", json={"company": "NA Co"})
    assert resp.status_code == 200
    assert resp.json()["company"] == "NA Co"


def test_non_admin_downloads_import_template(non_admin_client):
    assert non_admin_client.get("/api/leads/import/template").status_code == 200


def test_non_admin_imports_leads(non_admin_client):
    # row = name,email then 6 empty columns (8 total, matching TEMPLATE_HEADERS)
    csv_bytes = f"{_CSV_HEADERS}\nImported NA,imp-na@example.com,,,,,,".encode("utf-8")
    files = {"files": ("x.csv", csv_bytes, "text/csv")}
    resp = non_admin_client.post("/api/leads/import", files=files)
    assert resp.status_code == 200
    assert resp.json()["inserted"] == 1


def test_non_admin_cannot_delete_lead(non_admin_client, auth_client):
    lead_id = auth_client.post(
        "/api/leads/manual", json={"name": "Temp Lead", "phone": "5"}
    ).json()["id"]
    assert non_admin_client.delete(f"/api/leads/{lead_id}").status_code == 403


# --- Diagnósticos -----------------------------------------------------------

def test_non_admin_lists_submissions(non_admin_client):
    assert non_admin_client.get("/api/diagnostics/submissions").status_code == 200


def test_non_admin_reads_submission_detail(non_admin_client):
    sid = _make_submission()
    assert non_admin_client.get(f"/api/diagnostics/submissions/{sid}").status_code == 200


def test_non_admin_refreshes_email_status(non_admin_client):
    assert non_admin_client.post(
        "/api/diagnostics/submissions/refresh-email-status"
    ).status_code == 200


def test_non_admin_marks_submission_converted(non_admin_client):
    sid = _make_submission()
    pid = non_admin_client.post(
        "/api/prospects/", json={"name": "Conv", "email": "c@example.com", "source": "Web"}
    ).json()["id"]
    resp = non_admin_client.post(
        f"/api/diagnostics/submissions/{sid}/mark-converted", json={"prospect_id": pid}
    )
    assert resp.status_code == 200
    assert resp.json()["conversion_status"] == "prospect"


def test_non_admin_cannot_delete_submission(non_admin_client):
    sid = _make_submission()
    assert non_admin_client.delete(f"/api/diagnostics/submissions/{sid}").status_code == 403


def test_non_admin_cannot_touch_questions(non_admin_client):
    assert non_admin_client.get("/api/diagnostics/questions").status_code == 403
    assert non_admin_client.post("/api/diagnostics/questions", json={}).status_code == 403
    assert non_admin_client.put("/api/diagnostics/questions/1", json={}).status_code == 403
    assert non_admin_client.patch(
        "/api/diagnostics/questions/reorder", json={"ordered_ids": []}
    ).status_code == 403
