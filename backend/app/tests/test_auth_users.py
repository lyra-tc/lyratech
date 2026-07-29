import time

from ..core.security import get_password_hash, verify_password
from ..models.user import User
from .conftest import TestingSessionLocal, _build_test_app
from fastapi.testclient import TestClient


def test_first_registered_user_becomes_active_admin(client):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "first@lyratech.com.mx",
            "full_name": "First Admin",
            "password": "secret123",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["is_active"] is True
    assert body["is_admin"] is True
    assert body["is_superadmin"] is False


def test_registering_with_superadmin_name_grants_no_special_privileges(client):
    client.post(
        "/api/auth/register",
        json={
            "email": "first@lyratech.com.mx",
            "full_name": "First Admin",
            "password": "secret123",
        },
    )

    response = client.post(
        "/api/auth/register",
        json={
            "email": "ricardo@lyratech.com.mx",
            "full_name": "Ricardo Sierra Roa",
            "password": "secret123",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["is_active"] is False
    assert body["is_admin"] is False
    assert body["is_superadmin"] is False


def test_register_rejects_short_password(client):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "shortpw@lyratech.com.mx",
            "full_name": "Short Pw",
            "password": "abc",
        },
    )
    assert response.status_code == 400
    assert "al menos" in response.json()["detail"]


def test_login_rate_limited_after_repeated_failures(client):
    client.post(
        "/api/auth/register",
        json={
            "email": "target@lyratech.com.mx",
            "full_name": "Target User",
            "password": "secret123",
        },
    )

    for _ in range(5):
        response = client.post(
            "/api/auth/login",
            json={"email": "target@lyratech.com.mx", "password": "wrong"},
        )
        assert response.status_code == 401

    response = client.post(
        "/api/auth/login",
        json={"email": "target@lyratech.com.mx", "password": "wrong"},
    )
    assert response.status_code == 429


def test_changing_password_invalidates_old_token(client):
    client.post(
        "/api/auth/register",
        json={
            "email": "sessions@lyratech.com.mx",
            "full_name": "Session User",
            "password": "secret123",
        },
    )
    login_response = client.post(
        "/api/auth/login",
        json={"email": "sessions@lyratech.com.mx", "password": "secret123"},
    )
    old_token = login_response.json()["access_token"]

    old_me_response = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {old_token}"}
    )
    assert old_me_response.status_code == 200

    time.sleep(1.1)
    change_response = client.put(
        "/api/auth/change-password",
        headers={"Authorization": f"Bearer {old_token}"},
        json={"current_password": "secret123", "new_password": "newsecret123"},
    )
    assert change_response.status_code == 204

    stale_response = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {old_token}"}
    )
    assert stale_response.status_code == 401

    new_login_response = client.post(
        "/api/auth/login",
        json={"email": "sessions@lyratech.com.mx", "password": "newsecret123"},
    )
    new_token = new_login_response.json()["access_token"]
    fresh_response = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {new_token}"}
    )
    assert fresh_response.status_code == 200


def test_second_registered_user_starts_pending_and_cannot_login(client):
    client.post(
        "/api/auth/register",
        json={
            "email": "first@lyratech.com.mx",
            "full_name": "First Admin",
            "password": "secret123",
        },
    )

    second_response = client.post(
        "/api/auth/register",
        json={
            "email": "user@lyratech.com.mx",
            "full_name": "Pending User",
            "password": "secret123",
        },
    )

    assert second_response.status_code == 201
    assert second_response.json()["is_active"] is False
    assert second_response.json()["is_admin"] is False

    login_response = client.post(
        "/api/auth/login",
        json={"email": "user@lyratech.com.mx", "password": "secret123"},
    )
    assert login_response.status_code == 400
    assert "pendiente de activacion" in login_response.json()["detail"]


def test_admin_can_manage_non_admin_users(auth_client):
    db = TestingSessionLocal()
    try:
        user = User(
            email="member@lyratech.com.mx",
            full_name="Member User",
            hashed_password="hashed",
            is_active=False,
            is_admin=False,
            is_superadmin=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        user_id = user.id
    finally:
        db.close()

    list_response = auth_client.get("/api/users/")
    assert list_response.status_code == 200
    assert any(item["id"] == user_id for item in list_response.json())

    update_response = auth_client.patch(
        f"/api/users/{user_id}",
        json={"is_active": True, "is_admin": True},
    )
    assert update_response.status_code == 200
    assert update_response.json()["is_active"] is True
    assert update_response.json()["is_admin"] is True


def test_normal_admin_cannot_modify_or_delete_admin_accounts(auth_client):
    db = TestingSessionLocal()
    try:
        user = User(
            email="otheradmin@lyratech.com.mx",
            full_name="Other Admin",
            hashed_password="hashed",
            is_active=True,
            is_admin=True,
            is_superadmin=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        user_id = user.id
    finally:
        db.close()

    update_response = auth_client.patch(
        f"/api/users/{user_id}",
        json={"is_admin": False},
    )
    assert update_response.status_code == 400

    reset_response = auth_client.put(
        f"/api/users/{user_id}/reset-password",
        json={"new_password": "newsecret123"},
    )
    assert reset_response.status_code == 400

    delete_response = auth_client.delete(f"/api/users/{user_id}")
    assert delete_response.status_code == 400


def test_superadmin_can_remove_admin_from_normal_admin():
    app = _build_test_app()
    from ..core.deps import get_current_admin

    app.dependency_overrides[get_current_admin] = lambda: User(
        id=99,
        email="ricardo@lyratech.com.mx",
        full_name="Ricardo Sierra Roa",
        is_active=True,
        is_admin=True,
        is_superadmin=True,
    )
    client = TestClient(app)

    db = TestingSessionLocal()
    try:
        user = User(
            email="otheradmin@lyratech.com.mx",
            full_name="Other Admin",
            hashed_password="hashed",
            is_active=True,
            is_admin=True,
            is_superadmin=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        user_id = user.id
    finally:
        db.close()

    response = client.patch(
        f"/api/users/{user_id}",
        json={"is_admin": False},
    )
    assert response.status_code == 200
    assert response.json()["is_admin"] is False


def test_superadmin_account_cannot_be_modified(auth_client):
    db = TestingSessionLocal()
    try:
        user = User(
            email="ricardo@lyratech.com.mx",
            full_name="Ricardo Sierra Roa",
            hashed_password="hashed",
            is_active=True,
            is_admin=True,
            is_superadmin=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        user_id = user.id
    finally:
        db.close()

    update_response = auth_client.patch(
        f"/api/users/{user_id}",
        json={"is_admin": False},
    )
    assert update_response.status_code == 400


def test_admin_can_reset_password_for_non_admin(auth_client):
    db = TestingSessionLocal()
    try:
        user = User(
            email="member@lyratech.com.mx",
            full_name="Member User",
            hashed_password="oldhashed",
            is_active=True,
            is_admin=False,
            is_superadmin=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        user_id = user.id
    finally:
        db.close()

    response = auth_client.put(
        f"/api/users/{user_id}/reset-password",
        json={"new_password": "brandnew123"},
    )
    assert response.status_code == 204

    db = TestingSessionLocal()
    try:
        refreshed = db.query(User).filter(User.id == user_id).first()
        assert refreshed is not None
        assert verify_password("brandnew123", refreshed.hashed_password)
    finally:
        db.close()


def test_admin_reset_password_invalidates_target_users_old_token(client, auth_client):
    db = TestingSessionLocal()
    try:
        user = User(
            email="member2@lyratech.com.mx",
            full_name="Member Two",
            hashed_password=get_password_hash("oldpassword1"),
            is_active=True,
            is_admin=False,
            is_superadmin=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        user_id = user.id
    finally:
        db.close()

    login_response = client.post(
        "/api/auth/login",
        json={"email": "member2@lyratech.com.mx", "password": "oldpassword1"},
    )
    old_token = login_response.json()["access_token"]
    assert (
        client.get("/api/auth/me", headers={"Authorization": f"Bearer {old_token}"}).status_code
        == 200
    )

    time.sleep(1.1)
    reset_response = auth_client.put(
        f"/api/users/{user_id}/reset-password",
        json={"new_password": "brandnew456"},
    )
    assert reset_response.status_code == 204

    stale_response = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {old_token}"}
    )
    assert stale_response.status_code == 401
