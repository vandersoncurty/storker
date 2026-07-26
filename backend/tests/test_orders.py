def test_create_order(client):
    resp = client.post("/orders/", json={"shopee_order_id": "SHOP001"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["shopee_order_id"] == "SHOP001"
    assert data["status"] == "PENDING"


def test_duplicate_order(client, auth_headers):
    client.post("/orders/", json={"shopee_order_id": "SHOP002"}, headers=auth_headers)
    resp = client.post("/orders/", json={"shopee_order_id": "SHOP002"}, headers=auth_headers)
    assert resp.status_code == 200


def test_update_order_status(client):
    r = client.post("/orders/", json={"shopee_order_id": "SHOP003"})
    oid = r.json()["id"]
    resp = client.patch(f"/orders/{oid}/status?status=PRINTING")
    assert resp.status_code == 200
    assert resp.json()["status"] == "PRINTING"


def test_invalid_status(client):
    r = client.post("/orders/", json={"shopee_order_id": "SHOP004"})
    oid = r.json()["id"]
    resp = client.patch(f"/orders/{oid}/status?status=INVALID")
    assert resp.status_code == 400
