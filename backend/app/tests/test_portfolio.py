import json

import pytest
from sqlalchemy.orm import Session

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
MP4 = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 64
LOGO = {"logo": ("logo.png", PNG, "image/png")}
LOGO_AND_VIDEO = {
    "logo": ("logo.png", PNG, "image/png"),
    "video": ("demo.mp4", MP4, "video/mp4"),
}


def _fields(**overrides):
    data = {
        "name": "Saca La Bici",
        "description_es": "App de rodadas",
        "description_en": "Rides app",
        "description_fr": "Appli de sorties",
        "description_de": "Touren-App",
        "technologies": json.dumps(["Kotlin", "Node.js"]),
        "categories": json.dumps(["mobile"]),
        "link_type": "website",
        "website_url": "https://example.com",
    }
    data.update(overrides)
    return {k: v for k, v in data.items() if v is not None}


def _create(client, files=LOGO, **overrides):
    return client.post("/api/portfolio", data=_fields(**overrides), files=files)


# --- permisos ---------------------------------------------------------------

def test_admin_endpoints_require_admin(client, non_admin_client):
    for http in (client, non_admin_client):
        expected = 401 if http is client else 403
        assert http.get("/api/portfolio/admin").status_code == expected
        assert http.post("/api/portfolio", data=_fields(), files=LOGO).status_code == expected
        assert http.patch("/api/portfolio/1", data={"name": "x"}).status_code == expected
        assert http.delete("/api/portfolio/1").status_code == expected
        assert http.post("/api/portfolio/1/move", json={"direction": "up"}).status_code == expected
        assert http.patch("/api/portfolio/1/publish", json={"is_published": False}).status_code == expected


def test_public_list_needs_no_auth(client):
    res = client.get("/api/portfolio")
    assert res.status_code == 200
    assert res.json() == []


# --- crear -------------------------------------------------------------------

def test_create_website_project(auth_client, fake_storage):
    res = _create(auth_client)
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["name"] == "Saca La Bici"
    assert body["descriptions"] == {
        "es": "App de rodadas", "en": "Rides app",
        "fr": "Appli de sorties", "de": "Touren-App",
    }
    assert body["technologies"] == ["Kotlin", "Node.js"]
    assert body["categories"] == ["mobile"]
    assert body["link_type"] == "website"
    assert body["website_url"] == "https://example.com"
    assert body["is_published"] is True
    assert body["video_url"] is None

    prefix = f"https://media.test/lyratech/local/portafolio/saca-la-bici-{body['uuid']}/logo-"
    assert body["logo_url"].startswith(prefix)
    assert body["logo_url"].endswith(".png")

    [(key, (data, content_type))] = fake_storage.objects.items()
    assert body["logo_url"].endswith(key)
    assert data == PNG
    assert content_type == "image/png"


def test_create_appends_to_the_end(auth_client):
    first = _create(auth_client, name="Uno").json()
    second = _create(auth_client, name="Dos").json()
    assert (first["sort_order"], second["sort_order"]) == (0, 1)


def test_create_store_project_with_both_links(auth_client):
    res = _create(
        auth_client,
        link_type="store",
        website_url=None,
        play_store_url="https://play.google.com/store/apps/details?id=x",
        app_store_url="https://apps.apple.com/mx/app/x/id1",
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["play_store_url"].startswith("https://play.google.com/")
    assert body["app_store_url"].startswith("https://apps.apple.com/")
    assert body["website_url"] is None


def test_create_video_project_uploads_video(auth_client, fake_storage):
    res = _create(auth_client, files=LOGO_AND_VIDEO, link_type="video", website_url=None)
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["video_url"].endswith(".mp4")
    assert len(fake_storage.objects) == 2
    video_key = next(k for k in fake_storage.objects if "/video-" in k)
    assert fake_storage.objects[video_key][1] == "video/mp4"


def test_video_is_ignored_for_non_video_projects(auth_client, fake_storage):
    res = _create(auth_client, files=LOGO_AND_VIDEO)
    assert res.status_code == 201
    assert res.json()["video_url"] is None
    assert len(fake_storage.objects) == 1


def test_video_type_requires_a_video(auth_client, fake_storage):
    res = _create(auth_client, link_type="video", website_url=None)
    assert res.status_code == 422
    assert "video" in res.json()["detail"].lower()
    assert fake_storage.objects == {}


def test_logo_is_required(auth_client):
    assert _create(auth_client, files={}).status_code == 422


@pytest.mark.parametrize(
    "overrides",
    [
        {"name": "n" * 41},
        {"description_fr": "d" * 121},
        {"technologies": json.dumps([f"t{i}" for i in range(11)])},
        {"technologies": json.dumps(["t" * 21])},
        {"technologies": json.dumps(["React", "react"])},
        {"technologies": "no es json"},
        {"technologies": json.dumps("Kotlin")},
        {"categories": json.dumps([])},
        {"categories": json.dumps(["iot"])},
        {"website_url": None},
        {"link_type": "store", "website_url": None},
        {"link_type": "store", "play_store_url": "https://evil.test/app"},
        {"link_type": "nada"},
        {"name": None},
        {"technologies": ""},
    ],
)
def test_create_rejects_invalid_fields(auth_client, fake_storage, overrides):
    res = _create(auth_client, **overrides)
    assert res.status_code == 422, res.text
    assert isinstance(res.json()["detail"], str)
    assert fake_storage.objects == {}


def test_create_with_empty_name_gives_the_validators_message(auth_client):
    # Sent as an empty string (not omitted), so it must reach PortfolioFields'
    # own "required" check rather than being treated as absent.
    res = _create(auth_client, name="")
    assert res.status_code == 422
    assert res.json()["detail"] == "El nombre es requerido"


def test_create_rejects_oversized_logo(auth_client, fake_storage):
    big = PNG + b"\x00" * (2 * 1024 * 1024)
    res = _create(auth_client, files={"logo": ("logo.png", big, "image/png")})
    assert res.status_code == 422
    assert "excede" in res.json()["detail"]
    assert fake_storage.objects == {}


def test_create_rejects_logo_with_fake_extension(auth_client):
    res = _create(auth_client, files={"logo": ("logo.png", MP4, "image/png")})
    assert res.status_code == 422


def test_create_rejects_scripted_svg(auth_client):
    svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    res = _create(auth_client, files={"logo": ("logo.svg", svg, "image/svg+xml")})
    assert res.status_code == 422


def test_create_rejects_oversized_video(auth_client, fake_storage, monkeypatch):
    monkeypatch.setattr("app.routers.portfolio.VIDEO_MAX_BYTES", 32)
    res = _create(auth_client, files=LOGO_AND_VIDEO, link_type="video", website_url=None)
    assert res.status_code == 422
    assert fake_storage.objects == {}


def test_create_returns_503_when_storage_is_down(auth_client, fake_storage):
    fake_storage.fail = True
    res = _create(auth_client)
    assert res.status_code == 503
    fake_storage.fail = False
    assert auth_client.get("/api/portfolio/admin").json() == []


def test_create_returns_503_and_cleans_up_when_upload_fails_partway(auth_client, fake_storage):
    # Logo (first pending upload) succeeds, video (second) fails.
    fake_storage.fail_after = 1
    res = _create(auth_client, files=LOGO_AND_VIDEO, link_type="video", website_url=None)
    assert res.status_code == 503
    fake_storage.fail_after = None
    assert fake_storage.objects == {}
    assert auth_client.get("/api/portfolio/admin").json() == []


def test_create_cleans_up_uploads_when_db_commit_fails(auth_client, fake_storage, monkeypatch):
    def boom(self):
        raise RuntimeError("db down")

    monkeypatch.setattr(Session, "commit", boom)
    with pytest.raises(RuntimeError):
        _create(auth_client, files=LOGO_AND_VIDEO, link_type="video", website_url=None)
    assert fake_storage.objects == {}


# --- listados ----------------------------------------------------------------

def test_public_list_hides_unpublished_and_internal_fields(auth_client, client):
    visible = _create(auth_client, name="Visible").json()
    hidden = _create(auth_client, name="Oculto").json()
    auth_client.patch(f"/api/portfolio/{hidden['id']}/publish", json={"is_published": False})

    public = client.get("/api/portfolio").json()
    assert [p["name"] for p in public] == ["Visible"]
    assert public[0]["uuid"] == visible["uuid"]
    for internal in ("id", "sort_order", "is_published", "logo_key", "video_key"):
        assert internal not in public[0]

    admin = auth_client.get("/api/portfolio/admin").json()
    assert [p["name"] for p in admin] == ["Visible", "Oculto"]


# --- editar ------------------------------------------------------------------

def test_patch_updates_only_sent_fields(auth_client, fake_storage):
    created = _create(auth_client).json()
    before = dict(fake_storage.objects)
    res = auth_client.patch(f"/api/portfolio/{created['id']}", data={"name": "Nuevo nombre"})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["name"] == "Nuevo nombre"
    assert body["descriptions"] == created["descriptions"]
    assert body["logo_url"] == created["logo_url"]
    assert fake_storage.objects == before


def test_patch_replaces_logo_and_deletes_the_old_one(auth_client, fake_storage):
    created = _create(auth_client).json()
    [old_key] = fake_storage.objects
    webp = b"RIFF\x00\x00\x00\x00WEBPVP8 " + b"\x00" * 32
    res = auth_client.patch(
        f"/api/portfolio/{created['id']}",
        data={},
        files={"logo": ("nuevo.webp", webp, "image/webp")},
    )
    assert res.status_code == 200, res.text
    [new_key] = fake_storage.objects
    assert new_key != old_key
    assert new_key.endswith(".webp")
    # same project folder
    assert new_key.rsplit("/", 1)[0] == old_key.rsplit("/", 1)[0]
    assert res.json()["logo_url"].endswith(new_key)


def test_patch_switching_video_to_website_deletes_the_video(auth_client, fake_storage):
    created = _create(auth_client, files=LOGO_AND_VIDEO, link_type="video", website_url=None).json()
    res = auth_client.patch(
        f"/api/portfolio/{created['id']}",
        data={"link_type": "website", "website_url": "https://nuevo.test"},
    )
    assert res.status_code == 200, res.text
    assert res.json()["video_url"] is None
    assert not any("/video-" in key for key in fake_storage.objects)


def test_patch_replacing_video_deletes_the_old_one(auth_client, fake_storage):
    created = _create(auth_client, files=LOGO_AND_VIDEO, link_type="video", website_url=None).json()
    old_video = next(k for k in fake_storage.objects if "/video-" in k)
    res = auth_client.patch(
        f"/api/portfolio/{created['id']}",
        data={},
        files={"video": ("otro.webm", b"\x1a\x45\xdf\xa3" + b"\x00" * 32, "video/webm")},
    )
    assert res.status_code == 200, res.text
    videos = [k for k in fake_storage.objects if "/video-" in k]
    assert len(videos) == 1 and videos[0] != old_video and videos[0].endswith(".webm")


def test_patch_switching_to_video_requires_a_video(auth_client):
    created = _create(auth_client).json()
    res = auth_client.patch(f"/api/portfolio/{created['id']}", data={"link_type": "video"})
    assert res.status_code == 422


def test_patch_ignores_video_when_link_type_stays_non_video(auth_client, fake_storage):
    created = _create(auth_client).json()  # website project, no video
    res = auth_client.patch(
        f"/api/portfolio/{created['id']}",
        data={},
        files={"video": ("demo.mp4", MP4, "video/mp4")},
    )
    assert res.status_code == 200, res.text
    assert res.json()["video_url"] is None
    assert not any("/video-" in key for key in fake_storage.objects)


def test_patch_clears_one_of_two_store_links(auth_client):
    created = _create(
        auth_client,
        link_type="store",
        website_url=None,
        play_store_url="https://play.google.com/store/apps/details?id=x",
        app_store_url="https://apps.apple.com/mx/app/x/id1",
    ).json()
    res = auth_client.patch(f"/api/portfolio/{created['id']}", data={"app_store_url": ""})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["app_store_url"] is None
    assert body["play_store_url"] == created["play_store_url"]


def test_patch_clearing_required_website_url_is_rejected(auth_client):
    created = _create(auth_client).json()
    res = auth_client.patch(f"/api/portfolio/{created['id']}", data={"website_url": ""})
    assert res.status_code == 422


def test_patch_returns_503_when_storage_is_down_and_leaves_the_row_unchanged(auth_client, fake_storage):
    created = _create(auth_client).json()
    fake_storage.fail = True
    res = auth_client.patch(
        f"/api/portfolio/{created['id']}",
        data={"name": "No debería aplicar"},
        files={"logo": ("logo.png", PNG, "image/png")},
    )
    assert res.status_code == 503
    fake_storage.fail = False
    [current] = [
        p for p in auth_client.get("/api/portfolio/admin").json() if p["id"] == created["id"]
    ]
    assert current["name"] == created["name"]
    assert current["logo_url"] == created["logo_url"]


def test_patch_validates_the_merged_state(auth_client):
    created = _create(auth_client).json()
    res = auth_client.patch(f"/api/portfolio/{created['id']}", data={"link_type": "store"})
    assert res.status_code == 422
    assert "Play Store o App Store" in res.json()["detail"]


def test_patch_404(auth_client):
    assert auth_client.patch("/api/portfolio/999", data={"name": "x"}).status_code == 404


def test_patch_keeps_old_logo_when_db_commit_fails(auth_client, fake_storage, monkeypatch):
    created = _create(auth_client).json()
    [old_key] = fake_storage.objects

    def boom(self):
        raise RuntimeError("db down")

    monkeypatch.setattr(Session, "commit", boom)
    with pytest.raises(RuntimeError):
        auth_client.patch(
            f"/api/portfolio/{created['id']}",
            data={},
            files={"logo": ("logo.png", PNG, "image/png")},
        )
    assert list(fake_storage.objects) == [old_key]


# --- borrar / mover / publicar -----------------------------------------------

def test_delete_removes_record_and_folder(auth_client, fake_storage):
    keep = _create(auth_client, name="Se queda").json()
    gone = _create(auth_client, files=LOGO_AND_VIDEO, name="Se va", link_type="video", website_url=None).json()
    assert len(fake_storage.objects) == 3

    assert auth_client.delete(f"/api/portfolio/{gone['id']}").status_code == 204
    assert [p["name"] for p in auth_client.get("/api/portfolio/admin").json()] == ["Se queda"]
    assert len(fake_storage.objects) == 1
    assert next(iter(fake_storage.objects)).find(keep["uuid"]) != -1


def test_delete_still_deletes_record_when_storage_is_down(auth_client, fake_storage):
    created = _create(auth_client).json()
    fake_storage.fail = True
    assert auth_client.delete(f"/api/portfolio/{created['id']}").status_code == 204
    fake_storage.fail = False
    assert auth_client.get("/api/portfolio/admin").json() == []


def test_delete_404(auth_client):
    assert auth_client.delete("/api/portfolio/999").status_code == 404


def test_move_swaps_neighbors_and_is_noop_at_edges(auth_client):
    a = _create(auth_client, name="A").json()
    b = _create(auth_client, name="B").json()
    c = _create(auth_client, name="C").json()

    res = auth_client.post(f"/api/portfolio/{c['id']}/move", json={"direction": "up"})
    assert res.status_code == 200
    assert [p["name"] for p in res.json()] == ["A", "C", "B"]

    res = auth_client.post(f"/api/portfolio/{a['id']}/move", json={"direction": "down"})
    assert [p["name"] for p in res.json()] == ["C", "A", "B"]
    assert [p["sort_order"] for p in res.json()] == [0, 1, 2]

    res = auth_client.post(f"/api/portfolio/{c['id']}/move", json={"direction": "up"})
    assert [p["name"] for p in res.json()] == ["C", "A", "B"]
    res = auth_client.post(f"/api/portfolio/{b['id']}/move", json={"direction": "down"})
    assert [p["name"] for p in res.json()] == ["C", "A", "B"]

    assert [p["name"] for p in auth_client.get("/api/portfolio").json()] == ["C", "A", "B"]


def test_move_rejects_bad_direction(auth_client):
    created = _create(auth_client).json()
    res = auth_client.post(f"/api/portfolio/{created['id']}/move", json={"direction": "left"})
    assert res.status_code == 422


def test_publish_toggles_visibility(auth_client, client):
    created = _create(auth_client).json()
    res = auth_client.patch(f"/api/portfolio/{created['id']}/publish", json={"is_published": False})
    assert res.status_code == 200
    assert res.json()["is_published"] is False
    assert client.get("/api/portfolio").json() == []

    auth_client.patch(f"/api/portfolio/{created['id']}/publish", json={"is_published": True})
    assert len(client.get("/api/portfolio").json()) == 1
