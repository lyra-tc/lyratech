from app.models.client import ClientPayment
from app.models.prospect import Prospect
from app.tests.conftest import TestingSessionLocal


def _make_prospect(**kw):
    db = TestingSessionLocal()
    try:
        p = Prospect(name=kw.get("name", "P1"), email=kw.get("email", "p1@x.com"),
                     company=kw.get("company", "Acme"), service=kw.get("service", "auto"),
                     status="meeting_to_schedule")
        db.add(p)
        db.commit()
        db.refresh(p)
        return p.id
    finally:
        db.close()


BODY = {"responsable": "Ana"}


def test_clients_require_admin(client, non_admin_client):
    assert client.get("/api/clients/").status_code == 401
    assert non_admin_client.get("/api/clients/").status_code == 403
    assert client.get("/api/clients/stats").status_code == 401
    assert non_admin_client.get("/api/clients/stats").status_code == 403

    assert client.post("/api/clients/from-prospect/1", json=BODY).status_code == 401
    assert non_admin_client.post("/api/clients/from-prospect/1", json=BODY).status_code == 403
    assert client.put("/api/clients/1", json={}).status_code == 401
    assert non_admin_client.put("/api/clients/1", json={}).status_code == 403
    assert client.delete("/api/clients/1").status_code == 401
    assert non_admin_client.delete("/api/clients/1").status_code == 403


def test_from_prospect_creates_client_and_deletes_prospect(auth_client):
    pid = _make_prospect(name="Beta", company="BetaCo")
    res = auth_client.post(f"/api/clients/from-prospect/{pid}", json={"responsable": "Ana", "comisionista": "Luis"})
    assert res.status_code == 201
    body = res.json()
    assert body["name"] == "Beta"
    assert body["company"] == "BetaCo"
    assert body["status"] == "nuevo"
    assert body["responsable"] == "Ana"
    assert body["converted_from_prospect_id"] == pid
    assert body["payments"] == []
    # prospect gone
    assert auth_client.get(f"/api/prospects/{pid}").status_code == 404
    # the prospect id is a historical snapshot -- survives deleting the prospect
    assert auth_client.get(f"/api/clients/{body['id']}").json()["converted_from_prospect_id"] == pid


def test_from_prospect_404_and_blank_responsable(auth_client):
    assert auth_client.post("/api/clients/from-prospect/999999", json=BODY).status_code == 404
    pid = _make_prospect()
    assert auth_client.post(f"/api/clients/from-prospect/{pid}", json={"responsable": "  "}).status_code == 422


def test_list_paginates_searches_filters(auth_client):
    for i in range(6):
        pid = _make_prospect(name=f"C{i}", company=f"Co{i}")
        auth_client.post(f"/api/clients/from-prospect/{pid}", json={"responsable": "Ana"})
    page = auth_client.get("/api/clients/", params={"page": 2, "page_size": 4}).json()
    assert page["total"] == 6
    assert len(page["items"]) == 2
    assert auth_client.get("/api/clients/", params={"search": "Co3"}).json()["total"] == 1
    # move one to cerrado
    cid = auth_client.get("/api/clients/").json()["items"][0]["id"]
    auth_client.put(f"/api/clients/{cid}", json={"status": "cerrado"})
    assert auth_client.get("/api/clients/", params={"status": "cerrado"}).json()["total"] == 1


def test_update_fields_payments_and_guards(auth_client):
    pid = _make_prospect()
    cid = auth_client.post(f"/api/clients/from-prospect/{pid}", json=BODY).json()["id"]

    res = auth_client.put(f"/api/clients/{cid}", json={
        "project_amount": "12000.00",
        "payment_type": "iguala",
        "payments": [
            {"due_date": "2026-10-01", "concept": "M1", "amount": "6000.00", "is_paid": True, "paid_date": "2026-10-02"},
            {"due_date": "2026-11-01", "concept": "M2", "amount": "6000.00"},
        ],
    })
    assert res.status_code == 200
    body = res.json()
    assert len(body["payments"]) == 2
    assert body["payments"][0]["is_paid"] is True
    assert body["payments"][0]["paid_date"] == "2026-10-02"

    # replace again -> old rows gone
    res2 = auth_client.put(f"/api/clients/{cid}", json={"payments": [
        {"due_date": "2026-12-01", "concept": "Full", "amount": "12000.00"},
    ]})
    assert len(res2.json()["payments"]) == 1
    assert res2.json()["payments"][0]["concept"] == "Full"

    assert auth_client.put(f"/api/clients/{cid}", json={"responsable": "  "}).status_code == 422
    assert auth_client.put(f"/api/clients/{cid}", json={"comision_tipo": "porcentaje", "comision_valor": "150"}).status_code == 422

    # partial update must re-check the merged row, not just this payload
    assert auth_client.put(f"/api/clients/{cid}", json={"comision_tipo": "porcentaje", "comision_valor": "10"}).status_code == 200
    assert auth_client.put(f"/api/clients/{cid}", json={"comision_valor": "150"}).status_code == 422


def test_stats(auth_client):
    ids = []
    for i in range(3):
        pid = _make_prospect(name=f"S{i}")
        ids.append(auth_client.post(f"/api/clients/from-prospect/{pid}", json=BODY).json()["id"])
    auth_client.put(f"/api/clients/{ids[0]}", json={
        "project_amount": "10000.00",
        "payments": [
            {"due_date": "2026-10-01", "amount": "4000.00", "is_paid": True},
            {"due_date": "2026-11-01", "amount": "6000.00", "is_paid": False},
        ],
    })
    auth_client.put(f"/api/clients/{ids[1]}", json={"project_amount": "5000.00", "status": "cerrado"})
    s = auth_client.get("/api/clients/stats").json()
    assert s["total"] == 3
    assert s["by_status"]["nuevo"] == 2
    assert s["by_status"]["cerrado"] == 1
    assert float(s["contratado_total"]) == 15000.0
    assert float(s["cobrado_total"]) == 4000.0


def test_get_and_delete(auth_client):
    pid = _make_prospect()
    cid = auth_client.post(f"/api/clients/from-prospect/{pid}", json=BODY).json()["id"]
    auth_client.put(f"/api/clients/{cid}", json={"payments": [
        {"due_date": "2026-11-01", "amount": "1.00"},
        {"due_date": "2026-10-01", "amount": "2.00"},
    ]})
    got = auth_client.get(f"/api/clients/{cid}").json()
    assert [p["due_date"] for p in got["payments"]] == ["2026-10-01", "2026-11-01"]  # ordered
    assert auth_client.delete(f"/api/clients/{cid}").status_code == 204
    assert auth_client.get(f"/api/clients/{cid}").status_code == 404
    # payments cascade-deleted with the client
    db = TestingSessionLocal()
    try:
        assert db.query(ClientPayment).filter(ClientPayment.client_id == cid).count() == 0
    finally:
        db.close()
