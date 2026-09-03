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


def test_manual_lead_without_email_ok(auth_client):
    resp = auth_client.post("/api/leads/manual", json={"name": "P", "phone": "555 111 2222"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "P"
    assert body["email"] is None


def test_create_lead_manual_requires_admin(client, non_admin_client):
    payload = {"name": "M", "email": "m@example.com"}
    assert client.post("/api/leads/manual", json=payload).status_code == 401
    assert non_admin_client.post("/api/leads/manual", json=payload).status_code == 403


def test_admin_creates_manual_lead(auth_client):
    resp = auth_client.post(
        "/api/leads/manual",
        json={"name": "Manual Co", "email": "m@example.com", "service": "precio-fijo"},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Manual Co"
    assert body["email"] == "m@example.com"
    assert body["service"] == "precio-fijo"
    assert "id" in body


def test_manual_lead_dispatches_notification(auth_client, monkeypatch):
    auth_client.post(
        "/api/notifications/recipients", json={"email": "team@lyratech.com.mx"}
    )
    captured = {}

    def fake_send(lead, recipient_emails):
        captured["lead_name"] = lead.name
        captured["recipient_emails"] = recipient_emails

    monkeypatch.setattr("app.routers.leads.send_lead_notification_email", fake_send)

    resp = auth_client.post("/api/leads/manual", json={"name": "Notify Me"})
    assert resp.status_code == 201
    assert captured["lead_name"] == "Notify Me"
    assert captured["recipient_emails"] == ["team@lyratech.com.mx"]


def test_manual_lead_without_email_still_notifies(auth_client, monkeypatch):
    auth_client.post("/api/notifications/recipients", json={"email": "team@lyratech.com.mx"})
    captured = {}

    def fake_send(lead, recipient_emails):
        captured["email"] = lead.email
        captured["recipients"] = recipient_emails

    monkeypatch.setattr("app.routers.leads.send_lead_notification_email", fake_send)

    resp = auth_client.post("/api/leads/manual", json={"name": "NoMail", "phone": "555"})
    assert resp.status_code == 201
    assert captured["email"] is None
    assert captured["recipients"] == ["team@lyratech.com.mx"]


def test_update_lead_requires_admin(client, non_admin_client):
    assert client.put("/api/leads/1", json={}).status_code == 401
    assert non_admin_client.put("/api/leads/1", json={}).status_code == 403


def test_admin_updates_lead(auth_client):
    lead_id = auth_client.post(
        "/api/leads/manual", json={"name": "Editable", "email": "e@example.com"}
    ).json()["id"]

    resp = auth_client.put(f"/api/leads/{lead_id}", json={"company": "New Co"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["company"] == "New Co"
    assert body["name"] == "Editable"
    assert body["email"] == "e@example.com"


def test_update_missing_lead_404(auth_client):
    assert auth_client.put("/api/leads/999999", json={"name": "x"}).status_code == 404


def test_manual_lead_accepts_empty_email_string(auth_client):
    resp = auth_client.post(
        "/api/leads/manual", json={"name": "E", "email": "", "phone": "555"}
    )
    assert resp.status_code == 201
    assert resp.json()["email"] is None


def test_update_lead_accepts_empty_email_string(auth_client):
    lead_id = auth_client.post(
        "/api/leads/manual", json={"name": "U", "email": "u@example.com"}
    ).json()["id"]
    resp = auth_client.put(f"/api/leads/{lead_id}", json={"email": ""})
    assert resp.status_code == 200
    assert resp.json()["email"] is None


def test_update_lead_rejects_blank_name(auth_client):
    lead_id = auth_client.post("/api/leads/manual", json={"name": "K", "phone": "5"}).json()["id"]
    assert auth_client.put(f"/api/leads/{lead_id}", json={"name": "  "}).status_code == 422


def test_manual_lead_persists_industry_and_address(auth_client):
    resp = auth_client.post(
        "/api/leads/manual",
        json={
            "name": "Giro Co",
            "phone": "555",
            "industry": "Manufactura",
            "address": "Av. Siempre Viva 742",
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["industry"] == "Manufactura"
    assert body["address"] == "Av. Siempre Viva 742"

    listed = auth_client.get("/api/leads/").json()
    row = next(x for x in listed if x["id"] == body["id"])
    assert row["industry"] == "Manufactura"
    assert row["address"] == "Av. Siempre Viva 742"


def test_update_lead_industry_address(auth_client):
    lead_id = auth_client.post(
        "/api/leads/manual", json={"name": "L", "phone": "5"}
    ).json()["id"]
    resp = auth_client.put(
        f"/api/leads/{lead_id}", json={"industry": "Retail", "address": "Calle 1"}
    )
    assert resp.status_code == 200
    assert resp.json()["industry"] == "Retail"
    assert resp.json()["address"] == "Calle 1"

    listed = auth_client.get("/api/leads/").json()
    row = next(x for x in listed if x["id"] == lead_id)
    assert row["industry"] == "Retail"
    assert row["address"] == "Calle 1"
