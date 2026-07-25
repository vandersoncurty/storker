def test_get_settings(client):
    resp = client.get("/settings/")
    assert resp.status_code == 200
    data = resp.json()
    assert "integrations" in data
    assert "moonraker_url" in data["integrations"]
    assert "spoolman_url" in data["integrations"]
    assert "thingiverse_download_dir" in data["integrations"]
    assert "thingiverse_sync_interval" in data["integrations"]


def test_update_settings(client):
    payload = {
        "integrations": {
            "moonraker_url": "http://192.168.1.100:7125",
            "spoolman_url": "http://192.168.1.100:7912",
            "thingiverse_download_dir": "./downloads",
            "thingiverse_sync_interval": 60,
        }
    }
    resp = client.put("/settings/", json=payload)
    assert resp.status_code == 200
    assert resp.json()["integrations"]["moonraker_url"] == "http://192.168.1.100:7125"

    resp2 = client.get("/settings/")
    assert resp2.json()["integrations"]["thingiverse_download_dir"] == "./downloads"
    assert resp2.json()["integrations"]["thingiverse_sync_interval"] == 60


def test_update_integrations_patch(client):
    payload = {"moonraker_url": "http://new:7125", "spoolman_url": "http://new:7912"}
    resp = client.patch("/settings/integrations", json=payload)
    assert resp.status_code == 200
    assert resp.json()["moonraker_url"] == "http://new:7125"
