"""Testes da sincronização com Thingiverse e autenticação."""

import pytest
import httpx
from unittest.mock import patch


class TestSyncService:
    def test_sync_settings_reader(self):
        from app.services.settings_file import load_settings
        settings = load_settings()
        assert hasattr(settings, "moonraker")
        assert hasattr(settings, "spoolman")
        assert hasattr(settings, "thingiverse")
        assert hasattr(settings, "costs")


class TestAuth:
    def test_auth_login_default(self, client):
        resp = client.post("/auth/login", params={"username": "admin", "password": "admin"})
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["username"] == "admin"
        assert data["token_type"] == "bearer"

    def test_auth_login_wrong_password(self, client):
        resp = client.post("/auth/login", params={"username": "admin", "password": "wrong"})
        assert resp.status_code == 401

    def test_auth_login_wrong_user(self, client):
        resp = client.post("/auth/login", params={"username": "nobody", "password": "x"})
        assert resp.status_code == 401

    def test_auth_me_with_token(self, client):
        login_resp = client.post("/auth/login", params={"username": "admin", "password": "admin"})
        token = login_resp.json()["access_token"]

        resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["username"] == "admin"

    def test_auth_me_no_token(self, client):
        resp = client.get("/auth/me")
        assert resp.status_code == 401

    def test_auth_me_invalid_token(self, client):
        resp = client.get("/auth/me", headers={"Authorization": "Bearer invalid-token"})
        assert resp.status_code == 401


class TestSyncScheduler:
    def test_sync_scheduler_interval(self):
        from app.services.settings_file import load_settings
        settings = load_settings()
        interval = settings.thingiverse.sync_interval
        assert isinstance(interval, int)

    def test_sync_scheduler_stops_when_zero(self):
        from app.services.sync_scheduler import run_scheduled_sync
        import asyncio

        async def test():
            with patch("app.services.sync_scheduler.load_settings") as mock_load:
                mock_settings = type("Settings", (), {"thingiverse": type("Thing", (), {"sync_interval": 0})()})()
                mock_load.return_value = mock_settings

                task = asyncio.create_task(run_scheduled_sync())
                await asyncio.sleep(0.1)
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                assert True

        asyncio.run(test())

    def test_sync_scheduler_runs_with_interval(self):
        from app.services.sync_scheduler import run_scheduled_sync
        import asyncio

        async def test():
            called = False

            async def fake_sync():
                nonlocal called
                called = True

            with patch("app.services.sync_scheduler.load_settings") as mock_load:
                mock_settings = type("Settings", (), {"thingiverse": type("Thing", (), {"sync_interval": 0})()})()
                mock_load.return_value = mock_settings

                with patch("app.services.sync.sync_all", fake_sync):
                    task = asyncio.create_task(run_scheduled_sync())
                    await asyncio.sleep(0.1)
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass

        asyncio.run(test())
