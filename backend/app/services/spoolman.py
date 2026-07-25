"""Spoolman API client - gerenciamento de filamentos."""

import httpx

from ..config import SPOOLMAN_URL


async def list_spools() -> list:
    """Lista todos os spools de filamento cadastrados."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{SPOOLMAN_URL}/api/v1/spool")
        response.raise_for_status()
        return response.json()


async def get_spool(spool_id: int) -> dict:
    """Busca spool por ID."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{SPOOLMAN_URL}/api/v1/spool/{spool_id}")
        response.raise_for_status()
        return response.json()


async def get_filament_usage(spool_id: int) -> dict:
    """Retorna uso de filamento de um spool específico."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{SPOOLMAN_URL}/api/v1/spool/{spool_id}")
        response.raise_for_status()
        data = response.json()
        return {
            "spool_id": spool_id,
            "remaining_weight": data.get("weight"),
            "used_weight": data.get("used_weight", 0),
        }
