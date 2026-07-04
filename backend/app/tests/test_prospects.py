VALID_PAYLOAD = {
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "phone": "+52 555 000 0000",
    "company": "Acme",
    "service": "automatizaciones",
    "message": "Quiero saber más",
    "turnstile_token": "test-token",
}


def test_create_prospect_success(client, monkeypatch):
    monkeypatch.setattr(
        "app.routers.prospects.verify_turnstile_token",
        lambda token, remote_ip=None: True,
    )
    response = client.post("/api/prospects/", json=VALID_PAYLOAD)
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Ada Lovelace"
    assert body["email"] == "ada@example.com"
    assert "turnstile_token" not in body


def test_create_prospect_turnstile_failure(client, monkeypatch):
    monkeypatch.setattr(
        "app.routers.prospects.verify_turnstile_token",
        lambda token, remote_ip=None: False,
    )
    response = client.post("/api/prospects/", json=VALID_PAYLOAD)
    assert response.status_code == 400


def test_create_prospect_rate_limited(client, monkeypatch):
    monkeypatch.setattr(
        "app.routers.prospects.verify_turnstile_token",
        lambda token, remote_ip=None: True,
    )
    for _ in range(5):
        assert client.post("/api/prospects/", json=VALID_PAYLOAD).status_code == 201

    response = client.post("/api/prospects/", json=VALID_PAYLOAD)
    assert response.status_code == 429


def test_list_prospects_requires_auth(client):
    response = client.get("/api/prospects/")
    assert response.status_code == 403


def test_delete_prospect_requires_auth(client):
    response = client.delete("/api/prospects/1")
    assert response.status_code == 403
