"""Testes do router printers - dependem de Moonraker estar online."""

import pytest


@pytest.mark.skip(reason="Requer Moonraker online")
def test_printer_status(client, auth_headers):
    resp = client.get("/printers/status", headers=auth_headers)
    assert resp.status_code == 200


@pytest.mark.skip(reason="Requer Moonraker online")
def test_printer_stats(client, auth_headers):
    resp = client.get("/printers/stats", headers=auth_headers)
    assert resp.status_code == 200
