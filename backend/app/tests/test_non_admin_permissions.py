"""El rol `usuario` (activo, sin is_admin) opera pipeline pero nunca borra.

`non_admin_client` -> User(is_active=True, is_admin=False)
`auth_client`      -> User(is_active=True, is_admin=True)
`client`           -> sin auth (401)
"""

from app.core.lead_import import TEMPLATE_HEADERS


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
