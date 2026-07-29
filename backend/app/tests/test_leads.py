def test_list_leads_requires_auth(client):
    response = client.get("/api/leads/")
    assert response.status_code == 401


def test_list_leads_requires_admin(non_admin_client):
    response = non_admin_client.get("/api/leads/")
    assert response.status_code == 403


def test_admin_can_manage_leads(auth_client):
    create_response = auth_client.post(
        "/api/leads/",
        json={"name": "Ada Lovelace", "email": "ada@example.com"},
    )
    assert create_response.status_code == 201
    lead_id = create_response.json()["id"]

    list_response = auth_client.get("/api/leads/")
    assert list_response.status_code == 200
    assert any(item["id"] == lead_id for item in list_response.json())

    delete_response = auth_client.delete(f"/api/leads/{lead_id}")
    assert delete_response.status_code == 204
