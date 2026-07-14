from ..core.security import verify_password
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


def test_ricardo_is_registered_as_superadmin(client):
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
    assert body["is_active"] is True
    assert body["is_admin"] is True
    assert body["is_superadmin"] is True


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
