def test_estimate_cost(client, auth_headers):
    resp = client.post("/costs/estimate", json={
        "filament_grams": 100, "print_time_seconds": 3600,
        "filament_price_per_kg": 100, "printer_watts": 250, "kwh_rate": 0.95,
    }, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["filament_cost"] > 0
    assert data["electricity_cost"] > 0
    assert data["production_cost"] > 0
    assert data["final_price"] > data["production_cost"]


def test_estimate_with_labor(client, auth_headers):
    resp = client.post("/costs/estimate", json={
        "filament_grams": 50, "print_time_seconds": 1800,
        "filament_price_per_kg": 80, "labor_cost_per_hour": 30, "labor_hours": 1,
    }, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["labor_cost"] == 30.0


def test_estimate_with_taxes(client, auth_headers):
    resp = client.post("/costs/estimate", json={
        "filament_grams": 100, "print_time_seconds": 3600,
        "taxes_fees": 15.0,
    }, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["taxes_fees"] == 15.0


def test_cost_settings(client, auth_headers):
    resp = client.get("/costs/settings", headers=auth_headers)
    assert resp.status_code == 200
    assert "kwh_rate" in resp.json()


def test_parse_gcode(client, auth_headers):
    gcode = "; filament used [g] = 42.5\n; estimated printing time = 2h30m15s\n"
    resp = client.post("/costs/parse-gcode", files={"file": ("test.gcode", gcode)}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()["parsed"]
    assert data["filament_grams"] == 42.5
    assert data["print_time_seconds"] == 9015


def test_parse_gcode_time_elapsed(client, auth_headers):
    gcode = (
        ";TIME_ELAPSED:15\n"
        "G1 X10\n"
        ";TIME_ELAPSED:30\n"
        "G1 X20\n"
        ";TIME_ELAPSED:45\n"
        "G1 X30\n"
        ";TIME_ELAPSED:600\n"
    )
    resp = client.post("/costs/parse-gcode", files={"file": ("test.gcode", gcode)}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()["parsed"]
    assert data["print_time_seconds"] == 600


def test_parse_gcode_cura_format(client, auth_headers):
    gcode = "; filament used = 12.5g\n;Print Time: 00h 10m 00s\n"
    resp = client.post("/costs/parse-gcode", files={"file": ("test.gcode", gcode)}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()["parsed"]
    assert data["filament_grams"] == 12.5
    assert data["print_time_seconds"] == 600


def test_parse_gcode_orcaslicer_format(client, auth_headers):
    gcode = "; filament used [g] = 5.0\n;Total print time: 30m\n"
    resp = client.post("/costs/parse-gcode", files={"file": ("test.gcode", gcode)}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()["parsed"]
    assert data["filament_grams"] == 5.0
    assert data["print_time_seconds"] == 1800


def test_parse_gcode_seconds_format(client, auth_headers):
    gcode = "; filament used [g] = 8.2\n; total printing time = 3600s\n"
    resp = client.post("/costs/parse-gcode", files={"file": ("test.gcode", gcode)}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()["parsed"]
    assert data["filament_grams"] == 8.2
    assert data["print_time_seconds"] == 3600
