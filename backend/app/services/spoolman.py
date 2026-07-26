"""Spoolman API client - gerenciamento de filamentos."""

import httpx

from ..config import SPOOLMAN_URL as FALLBACK_URL
from .settings_file import load_settings

TIMEOUT = httpx.Timeout(10.0, connect=3.0)


def _get_url() -> str:
    try:
        settings = load_settings()
        return settings.spoolman.server or FALLBACK_URL
    except Exception:
        return FALLBACK_URL


async def list_spools() -> list:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(f"{_get_url()}/api/v1/spool")
        response.raise_for_status()
        return response.json()


async def get_spool(spool_id: int) -> dict:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(f"{_get_url()}/api/v1/spool/{spool_id}")
        response.raise_for_status()
        return response.json()


async def get_filament_usage(spool_id: int) -> dict:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(f"{_get_url()}/api/v1/spool/{spool_id}")
        response.raise_for_status()
        data = response.json()
        return {
            "spool_id": spool_id,
            "remaining_weight": data.get("weight"),
            "used_weight": data.get("used_weight", 0),
        }


async def list_filaments() -> list:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(f"{_get_url()}/api/v1/filament")
        response.raise_for_status()
        return response.json()
