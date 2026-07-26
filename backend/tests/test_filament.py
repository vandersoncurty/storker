"""Testes do router filament - dependem de Spoolman online."""

import pytest


@pytest.mark.skip(reason="Requer Spoolman online")
def test_list_spools(client, auth_headers):
    resp = client.get("/filament/spools", headers=auth_headers)
    assert resp.status_code == 200
    assert "spools" in resp.json()


@pytest.mark.skip(reason="Requer Spoolman online")
def test_list_filaments(client, auth_headers):
    resp = client.get("/filament/filaments", headers=auth_headers)
    assert resp.status_code == 200
    assert "filaments" in resp.json()
