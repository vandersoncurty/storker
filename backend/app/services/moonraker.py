"""Moonraker API client - interface com Klipper via Moonraker."""

import httpx

from ..config import MOONRAKER_URL


async def get_printer_info() -> dict:
    """Busca status geral da impressora via Moonraker."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{MOONRAKER_URL}/printer/info")
        response.raise_for_status()
        return response.json()


async def get_print_stats() -> dict:
    """Busca estatísticas de impressão em andamento."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{MOONRAKER_URL}/printer/objects/query?heater_bed&gcode_move&print_stats")
        response.raise_for_status()
        return response.json()


async def start_print(gcode_filename: str) -> dict:
    """Envia arquivo G-code para impressão via Moonraker."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{MOONRAKER_URL}/printer/print/start",
            json={"filename": gcode_filename}
        )
        response.raise_for_status()
        return response.json()


async def cancel_print() -> dict:
    """Cancela a impressão em andamento."""
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{MOONRAKER_URL}/printer/print/cancel")
        response.raise_for_status()
        return response.json()


async def pause_print() -> dict:
    """Pausa a impressão em andamento."""
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{MOONRAKER_URL}/printer/print/pause")
        response.raise_for_status()
        return response.json()


async def resume_print() -> dict:
    """Retoma a impressão pausada."""
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{MOONRAKER_URL}/printer/print/resume")
        response.raise_for_status()
        return response.json()
