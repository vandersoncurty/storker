"""Testes do dashboard — endpoints de estatísticas."""


def test_dashboard_empty(client):
    resp = client.get("/dashboard/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["products"]["total"] == 0
    assert data["orders"]["total"] == 0
    assert data["stl_projects"]["total"] == 0
    assert data["stl_files"]["total_stl"] == 0
    assert data["thingiverse"]["collections"] == 0


def test_dashboard_with_products(client):
    client.post("/products/", json={"title": "Produto A", "description": "Test"})
    client.post("/products/", json={"title": "Produto B", "description": "Test"})
    client.patch("/products/1", json={"production_cost": 20.0, "sale_price": 50.0})
    client.patch("/products/2", json={"production_cost": 40.0, "sale_price": 100.0})
    client.post("/products/", json={"title": "Produto C", "description": "Test"})

    resp = client.get("/dashboard/")
    data = resp.json()
    assert data["products"]["total"] == 3
    assert data["products"]["with_costs"] >= 2
    assert data["products"]["with_price"] >= 2


def test_dashboard_with_stl_projects(client):
    from io import BytesIO
    fake_stl = BytesIO(b"solid test\nfacet normal 0 0 0\nouter loop\nvertex 0 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid test\n")
    client.post("/stl/upload", files={"files": ("test.stl", fake_stl, "application/sla")})

    resp = client.get("/dashboard/")
    data = resp.json()
    assert data["stl_projects"]["total"] == 1
    assert data["stl_projects"]["upload"] == 1
    assert data["stl_files"]["total_stl"] == 1


def test_dashboard_charts_empty(client):
    resp = client.get("/dashboard/charts")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data["products_by_month"], list)
    assert isinstance(data["orders_by_month"], list)
    assert isinstance(data["projects_by_month"], list)
    assert isinstance(data["price_distribution"], list)
    assert isinstance(data["total_filament_grams"], (int, float))
