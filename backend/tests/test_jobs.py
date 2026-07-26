"""Testes do router jobs - alguns dependem de Moonraker online."""

import pytest


@pytest.mark.skip(reason="Requer Moonraker online")
def test_job_queue(client, auth_headers):
    resp = client.get("/jobs/queue", headers=auth_headers)
    assert resp.status_code == 200
    assert "queue" in resp.json()


@pytest.mark.skip(reason="Requer Moonraker online")
def test_list_gcodes(client, auth_headers):
    resp = client.get("/jobs/gcodes", headers=auth_headers)
    assert resp.status_code == 200
    assert "files" in resp.json()
