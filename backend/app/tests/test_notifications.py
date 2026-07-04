def test_list_recipients_requires_auth(client):
    response = client.get("/api/notifications/recipients")
    assert response.status_code == 403


def test_create_recipient_requires_auth(client):
    response = client.post("/api/notifications/recipients", json={"email": "a@b.com"})
    assert response.status_code == 403


def test_delete_recipient_requires_auth(client):
    response = client.delete("/api/notifications/recipients/1")
    assert response.status_code == 403


def test_send_test_recipient_requires_auth(client):
    response = client.post("/api/notifications/recipients/1/test")
    assert response.status_code == 403


def test_create_and_list_recipients(auth_client):
    create_res = auth_client.post(
        "/api/notifications/recipients", json={"email": "team@lyratech.com.mx"}
    )
    assert create_res.status_code == 201
    body = create_res.json()
    assert body["email"] == "team@lyratech.com.mx"
    assert "id" in body
    assert "created_at" in body

    list_res = auth_client.get("/api/notifications/recipients")
    assert list_res.status_code == 200
    emails = [r["email"] for r in list_res.json()]
    assert "team@lyratech.com.mx" in emails


def test_create_recipient_duplicate_rejected(auth_client):
    auth_client.post("/api/notifications/recipients", json={"email": "dup@lyratech.com.mx"})
    response = auth_client.post(
        "/api/notifications/recipients", json={"email": "dup@lyratech.com.mx"}
    )
    assert response.status_code == 409


def test_delete_recipient(auth_client):
    create_res = auth_client.post(
        "/api/notifications/recipients", json={"email": "gone@lyratech.com.mx"}
    )
    recipient_id = create_res.json()["id"]

    delete_res = auth_client.delete(f"/api/notifications/recipients/{recipient_id}")
    assert delete_res.status_code == 204

    list_res = auth_client.get("/api/notifications/recipients")
    assert all(r["id"] != recipient_id for r in list_res.json())


def test_delete_recipient_not_found(auth_client):
    response = auth_client.delete("/api/notifications/recipients/9999")
    assert response.status_code == 404


def test_send_test_recipient_email(auth_client, monkeypatch):
    create_res = auth_client.post(
        "/api/notifications/recipients", json={"email": "team@lyratech.com.mx"}
    )
    recipient_id = create_res.json()["id"]
    captured = {}

    def fake_send(email):
        captured["email"] = email

    monkeypatch.setattr(
        "app.routers.notifications.send_test_notification_email",
        fake_send,
    )

    response = auth_client.post(f"/api/notifications/recipients/{recipient_id}/test")
    assert response.status_code == 200
    assert captured["email"] == "team@lyratech.com.mx"
    assert response.json()["message"] == "Correo de prueba enviado correctamente."


def test_send_test_recipient_not_found(auth_client):
    response = auth_client.post("/api/notifications/recipients/9999/test")
    assert response.status_code == 404
