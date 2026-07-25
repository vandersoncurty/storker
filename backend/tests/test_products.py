def test_root(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "API Operacional"


def test_create_product(client):
    payload = {"title": "Teste", "description": "Descricao teste"}
    resp = client.post("/products/", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Teste"
    assert data["is_sliced"] is False
    assert data["images"] == []


def test_list_products(client):
    client.post("/products/", json={"title": "P1"})
    client.post("/products/", json={"title": "P2"})
    resp = client.get("/products/")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_get_product(client):
    r = client.post("/products/", json={"title": "P3"})
    pid = r.json()["id"]
    resp = client.get(f"/products/{pid}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "P3"


def test_update_product(client):
    r = client.post("/products/", json={"title": "Old"})
    pid = r.json()["id"]
    resp = client.patch(f"/products/{pid}", json={"title": "New", "is_sliced": True})
    assert resp.status_code == 200
    assert resp.json()["title"] == "New"
    assert resp.json()["is_sliced"] is True


def test_update_product_costs(client):
    r = client.post("/products/", json={"title": "CostTest"})
    pid = r.json()["id"]
    resp = client.patch(f"/products/{pid}", json={
        "sale_price": 25.0,
        "production_cost": 10.0,
        "taxes_fees": 3.0,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["sale_price"] == 25.0
    assert data["production_cost"] == 10.0
    assert data["taxes_fees"] == 3.0


def test_delete_product(client):
    r = client.post("/products/", json={"title": "DEL"})
    pid = r.json()["id"]
    resp = client.delete(f"/products/{pid}")
    assert resp.status_code == 200
    assert client.get(f"/products/{pid}").status_code == 404


def test_delete_nonexistent_product(client):
    resp = client.delete("/products/9999")
    assert resp.status_code == 404
