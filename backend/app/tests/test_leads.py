VALID_LEAD_PAYLOAD = {
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "phone": "+52 555 000 0000",
    "company": "Acme",
    "service": "automatizaciones",
    "message": "Quiero saber mas",
    "turnstile_token": "lead-token",
}


def _allow_turnstile(monkeypatch):
    monkeypatch.setattr(
        "app.routers.leads.verify_turnstile_token",
        lambda token, remote_ip=None: True,
    )


def test_create_lead_success(client, monkeypatch):
    _allow_turnstile(monkeypatch)
    response = client.post("/api/leads/", json=VALID_LEAD_PAYLOAD)
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Ada Lovelace"
    assert body["email"] == "ada@example.com"
    assert body["service"] == "automatizaciones"
    assert body["message"] == "Quiero saber mas"
    assert "turnstile_token" not in body


def test_create_lead_turnstile_failure(client, monkeypatch):
    monkeypatch.setattr(
        "app.routers.leads.verify_turnstile_token",
        lambda token, remote_ip=None: False,
    )
    response = client.post("/api/leads/", json=VALID_LEAD_PAYLOAD)
    assert response.status_code == 400


def test_create_lead_rate_limited(client, monkeypatch):
    _allow_turnstile(monkeypatch)
    for i in range(5):
        payload = {**VALID_LEAD_PAYLOAD, "turnstile_token": f"lead-token-{i}"}
        assert client.post("/api/leads/", json=payload).status_code == 201
    payload = {**VALID_LEAD_PAYLOAD, "turnstile_token": "lead-token-5"}
    assert client.post("/api/leads/", json=payload).status_code == 429


def test_create_lead_duplicate_token_rejected(client, monkeypatch):
    _allow_turnstile(monkeypatch)
    assert client.post("/api/leads/", json=VALID_LEAD_PAYLOAD).status_code == 201
    assert client.post("/api/leads/", json=VALID_LEAD_PAYLOAD).status_code == 409


def test_list_leads_requires_auth(client):
    assert client.get("/api/leads/").status_code == 401


def test_delete_lead_requires_auth(client):
    assert client.delete("/api/leads/1").status_code == 401


def test_admin_can_list_and_delete_leads(client, auth_client, monkeypatch):
    _allow_turnstile(monkeypatch)
    created = client.post("/api/leads/", json=VALID_LEAD_PAYLOAD)
    assert created.status_code == 201
    lead_id = created.json()["id"]

    listed = auth_client.get("/api/leads/")
    assert listed.status_code == 200
    assert any(item["id"] == lead_id for item in listed.json())

    assert auth_client.delete(f"/api/leads/{lead_id}").status_code == 204
    assert auth_client.delete(f"/api/leads/{lead_id}").status_code == 404


def test_create_lead_dispatches_notification_to_configured_recipients(
    client, auth_client, monkeypatch
):
    _allow_turnstile(monkeypatch)
    auth_client.post(
        "/api/notifications/recipients", json={"email": "team@lyratech.com.mx"}
    )

    captured = {}

    def fake_send(lead, recipient_emails):
        captured["lead_name"] = lead.name
        captured["recipient_emails"] = recipient_emails

    monkeypatch.setattr("app.routers.leads.send_lead_notification_email", fake_send)

    response = client.post("/api/leads/", json=VALID_LEAD_PAYLOAD)
    assert response.status_code == 201
    assert captured["lead_name"] == "Ada Lovelace"
    assert captured["recipient_emails"] == ["team@lyratech.com.mx"]


def test_create_lead_dispatches_with_empty_list_when_no_recipients(client, monkeypatch):
    _allow_turnstile(monkeypatch)
    captured = {}

    def fake_send(lead, recipient_emails):
        captured["recipient_emails"] = recipient_emails

    monkeypatch.setattr("app.routers.leads.send_lead_notification_email", fake_send)

    assert client.post("/api/leads/", json=VALID_LEAD_PAYLOAD).status_code == 201
    assert captured["recipient_emails"] == []
