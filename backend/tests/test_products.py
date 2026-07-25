def test_root(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "API Operacional"


def test_create_product(client):
    payload = {
        "name": "Teste",
        "gcode_filename": "teste.gcode",
        "filament_grams": 50.0,
        "print_time_seconds": 3600,
        "sale_price": 25.0,
    }
    resp = client.post("/products/", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Teste"
    assert data["id"] is not None


def test_list_products(client):
    client.post("/products/", json={
        "name": "P1", "gcode_filename": "p1.gcode",
        "filament_grams": 10, "print_time_seconds": 600, "sale_price": 15,
    })
    resp = client.get("/products/")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_get_product(client):
    r = client.post("/products/", json={
        "name": "P2", "gcode_filename": "p2.gcode",
        "filament_grams": 20, "print_time_seconds": 1200, "sale_price": 30,
    })
    pid = r.json()["id"]
    resp = client.get(f"/products/{pid}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "P2"


def test_delete_product(client):
    r = client.post("/products/", json={
        "name": "DEL", "gcode_filename": "del.gcode",
        "filament_grams": 5, "print_time_seconds": 300, "sale_price": 10,
    })
    pid = r.json()["id"]
    resp = client.delete(f"/products/{pid}")
    assert resp.status_code == 200
    assert client.get(f"/products/{pid}").status_code == 404
