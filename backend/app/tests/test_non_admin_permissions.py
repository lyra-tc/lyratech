"""El rol `usuario` (activo, sin is_admin) opera pipeline pero nunca borra.

`non_admin_client` -> User(is_active=True, is_admin=False)
`auth_client`      -> User(is_active=True, is_admin=True)
`client`           -> sin auth (401)
"""


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
