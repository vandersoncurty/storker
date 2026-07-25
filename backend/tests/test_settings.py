def test_get_settings(client):
    resp = client.get("/settings/")
    assert resp.status_code == 200
    data = resp.json()
    assert "moonraker" in data
    assert "spoolman" in data
    assert "thingiverse" in data
    assert "server" in data["moonraker"]
    assert "server" in data["spoolman"]
    assert "download_dir" in data["thingiverse"]
    assert "sync_interval" in data["thingiverse"]
    assert "app_token" in data["thingiverse"]


def test_update_settings(client):
    original = client.get("/settings/").json()
    payload = {
        "moonraker": {"server": "http://test-moonraker:7125"},
        "spoolman": {"server": "http://test-spoolman:7912"},
        "thingiverse": {"download_dir": "./downloads", "sync_interval": 60, "app_token": "tok123"},
    }
    resp = client.put("/settings/", json=payload)
    assert resp.status_code == 200
    assert resp.json()["moonraker"]["server"] == "http://test-moonraker:7125"

    resp2 = client.get("/settings/")
    assert resp2.json()["thingiverse"]["download_dir"] == "./downloads"
    assert resp2.json()["thingiverse"]["sync_interval"] == 60

    client.put("/settings/", json=original)


def test_update_moonraker_patch(client):
    original = client.get("/settings/").json()
    payload = {"server": "http://patched:7125"}
    resp = client.patch("/settings/moonraker", json=payload)
    assert resp.status_code == 200
    assert resp.json()["server"] == "http://patched:7125"
    client.put("/settings/", json=original)


def test_update_thingiverse_patch(client):
    original = client.get("/settings/").json()
    payload = {"download_dir": "/tmp/models", "sync_interval": 30, "app_token": "abc123"}
    resp = client.patch("/settings/thingiverse", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["download_dir"] == "/tmp/models"
    assert data["sync_interval"] == 30
    assert data["app_token"] == "abc123"
    client.put("/settings/", json=original)
