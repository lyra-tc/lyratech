import pytest

from .conftest import TestingSessionLocal
from ..models.prospect import Prospect


def test_list_prospects_requires_auth(client):
    assert client.get("/api/prospects/").status_code == 401


def test_list_prospects_requires_admin(non_admin_client):
    assert non_admin_client.get("/api/prospects/").status_code == 403


def test_admin_can_create_and_read_prospect(auth_client):
    created = auth_client.post(
        "/api/prospects/",
        json={
            "name": "Ada Lovelace",
            "email": "ada@example.com",
            "service": "precio-fijo",
            "source": "Web",
        },
    )
    assert created.status_code == 201
    body = created.json()
    assert body["service"] == "precio-fijo"
    assert body["status"] == "meeting_to_schedule"
    prospect_id = body["id"]

    fetched = auth_client.get(f"/api/prospects/{prospect_id}")
    assert fetched.status_code == 200
    assert fetched.json()["name"] == "Ada Lovelace"


def test_get_missing_prospect_returns_404(auth_client):
    assert auth_client.get("/api/prospects/99999").status_code == 404


def test_admin_can_update_prospect(auth_client):
    created = auth_client.post(
        "/api/prospects/", json={"name": "Grace", "source": "Web"}
    )
    prospect_id = created.json()["id"]

    updated = auth_client.put(
        f"/api/prospects/{prospect_id}",
        json={"status": "lost", "service": "equipo-dedicado"},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "lost"
    assert updated.json()["service"] == "equipo-dedicado"


def test_admin_can_delete_prospect(auth_client):
    created = auth_client.post(
        "/api/prospects/", json={"name": "Temp", "source": "Web"}
    )
    prospect_id = created.json()["id"]
    assert auth_client.delete(f"/api/prospects/{prospect_id}").status_code == 204
    assert auth_client.delete(f"/api/prospects/{prospect_id}").status_code == 404


def test_prospect_row_persists_service(auth_client):
    auth_client.post(
        "/api/prospects/",
        json={"name": "Persisted", "service": "diagnostico", "source": "Web"},
    )
    db = TestingSessionLocal()
    try:
        row = db.query(Prospect).filter(Prospect.name == "Persisted").first()
        assert row is not None
        assert row.service == "diagnostico"
    finally:
        db.close()


@pytest.mark.parametrize("status", ["meeting_to_schedule", "call_later", "lost"])
def test_prospect_status_values_round_trip(auth_client, status):
    created = auth_client.post(
        "/api/prospects/", json={"name": "S", "source": "Web", "status": status}
    )
    assert created.status_code == 201
    assert created.json()["status"] == status


def test_prospect_rejects_removed_status_value(auth_client):
    created = auth_client.post(
        "/api/prospects/", json={"name": "X", "source": "Web", "status": "won"}
    )
    assert created.status_code == 422


def test_prospect_default_status_is_meeting_to_schedule(auth_client):
    created = auth_client.post("/api/prospects/", json={"name": "D", "source": "Web"})
    assert created.json()["status"] == "meeting_to_schedule"
