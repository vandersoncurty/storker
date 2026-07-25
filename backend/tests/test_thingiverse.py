def test_list_collections_empty(client):
    resp = client.get("/thingiverse/collections")
    assert resp.status_code == 200
    assert resp.json() == []


def test_add_collection(client):
    resp = client.post("/thingiverse/collections", json={
        "collection_id": 12345,
        "name": "Minha Collection"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["collection_id"] == 12345
    assert data["name"] == "Minha Collection"


def test_duplicate_collection(client):
    client.post("/thingiverse/collections", json={"collection_id": 999})
    resp = client.post("/thingiverse/collections", json={"collection_id": 999})
    assert resp.status_code == 400


def test_remove_collection(client):
    client.post("/thingiverse/collections", json={"collection_id": 111})
    resp = client.delete("/thingiverse/collections/111")
    assert resp.status_code == 200
    assert len(client.get("/thingiverse/collections").json()) == 0


def test_list_downloads_empty(client):
    resp = client.get("/thingiverse/downloads")
    assert resp.status_code == 200
    assert resp.json() == []
