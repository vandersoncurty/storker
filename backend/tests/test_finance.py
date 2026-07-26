def test_create_income(client, auth_headers):
    resp = client.post("/finance/entries", json={
        "type": "income", "description": "Venda teste", "amount": 100.0, "category": "sale",
    }, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["type"] == "income"
    assert data["amount"] == 100.0


def test_create_expense(client, auth_headers):
    resp = client.post("/finance/entries", json={
        "type": "expense", "description": "Filamento PLA", "amount": 50.0, "category": "material",
    }, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["type"] == "expense"


def test_list_entries(client, auth_headers):
    client.post("/finance/entries", json={"type": "income", "description": "V1", "amount": 10}, headers=auth_headers)
    client.post("/finance/entries", json={"type": "expense", "description": "E1", "amount": 5}, headers=auth_headers)
    resp = client.get("/finance/entries", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_balance(client, auth_headers):
    client.post("/finance/entries", json={"type": "income", "description": "V1", "amount": 100}, headers=auth_headers)
    client.post("/finance/entries", json={"type": "expense", "description": "E1", "amount": 30}, headers=auth_headers)
    resp = client.get("/finance/balance", headers=auth_headers)
    data = resp.json()
    assert data["total_income"] == 100.0
    assert data["total_expense"] == 30.0
    assert data["balance"] == 70.0


def test_delete_entry(client, auth_headers):
    r = client.post("/finance/entries", json={"type": "income", "description": "V1", "amount": 10}, headers=auth_headers)
    eid = r.json()["id"]
    resp = client.delete(f"/finance/entries/{eid}", headers=auth_headers)
    assert resp.status_code == 200
    assert client.get("/finance/entries", headers=auth_headers).json() == []


def test_invalid_type(client, auth_headers):
    resp = client.post("/finance/entries", json={"type": "invalid", "description": "X", "amount": 10}, headers=auth_headers)
    assert resp.status_code == 400
