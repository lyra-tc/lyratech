"""Auth via httpOnly session cookie (in addition to the Bearer header)."""


def _register_active_user(client, email="cookie@lyratech.com.mx", password="secret123"):
    # The first registered user becomes an active admin.
    resp = client.post(
        "/api/auth/register",
        json={"email": email, "full_name": "Cookie User", "password": password},
    )
    assert resp.status_code == 201
    return email, password


def test_login_sets_httponly_session_cookie(client):
    email, password = _register_active_user(client)

    resp = client.post("/api/auth/login", json={"email": email, "password": password})

    assert resp.status_code == 200
    set_cookie = resp.headers.get("set-cookie", "")
    assert "lyratech_session=" in set_cookie
    assert "httponly" in set_cookie.lower()
    assert "samesite=lax" in set_cookie.lower()


def test_me_works_with_cookie_only(client):
    email, password = _register_active_user(client)
    client.post("/api/auth/login", json={"email": email, "password": password})

    # No Authorization header — rely purely on the cookie jar set by login.
    resp = client.get("/api/auth/me")

    assert resp.status_code == 200
    assert resp.json()["email"] == email


def test_logout_clears_session_cookie(client):
    email, password = _register_active_user(client)
    client.post("/api/auth/login", json={"email": email, "password": password})

    resp = client.post("/api/auth/logout")
    assert resp.status_code == 204

    me = client.get("/api/auth/me")
    assert me.status_code == 401


def test_me_without_any_credentials_returns_401(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_me_with_invalid_cookie_returns_401(client):
    client.cookies.set("lyratech_session", "not-a-real-token")
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_bearer_header_still_works_after_cookie_support(client):
    email, password = _register_active_user(client)
    login = client.post("/api/auth/login", json={"email": email, "password": password})
    token = login.json()["access_token"]

    client.cookies.clear()
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert resp.status_code == 200
    assert resp.json()["email"] == email
