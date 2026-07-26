"""Moonraker API client - interface com Klipper via Moonraker."""

import httpx

from ..config import MOONRAKER_URL as FALLBACK_URL
from .settings_file import load_settings

TIMEOUT = httpx.Timeout(10.0, connect=3.0)


def _get_url() -> str:
    try:
        settings = load_settings()
        return settings.printers.default_server or settings.moonraker.server or FALLBACK_URL
    except Exception:
        return FALLBACK_URL


async def get_printer_info() -> dict:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(f"{_get_url()}/printer/info")
        response.raise_for_status()
        return response.json()


async def get_print_stats() -> dict:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(f"{_get_url()}/printer/objects/query?extruder&heater_bed&gcode_move&print_stats&display_status")
        response.raise_for_status()
        return response.json()


async def get_printer_objects_list() -> dict:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(f"{_get_url()}/printer/objects/list")
        response.raise_for_status()
        return response.json()


async def get_job_queue() -> list:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(f"{_get_url()}/server/job_queue/status")
        response.raise_for_status()
        data = response.json()
        return data.get("result", {}).get("queue", [])


async def post_job_queue(filename: str) -> dict:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.post(
            f"{_get_url()}/server/job_queue/job",
            json={"filename": filename},
        )
        response.raise_for_status()
        return response.json()


async def get_directory(directory: str = "gcodes") -> dict:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.get(f"{_get_url()}/server/files/list?root={directory}")
        response.raise_for_status()
        return response.json()


async def upload_file_to_moonraker(filename: str, filepath: str) -> dict:
    async with httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=3.0)) as client:
        with open(filepath, "rb") as f:
            response = await client.post(
                f"{_get_url()}/server/files/upload",
                files={"file": (filename, f, "application/octet-stream")},
            )
        response.raise_for_status()
        return response.json()


async def start_print(gcode_filename: str) -> dict:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.post(
            f"{_get_url()}/printer/print/start",
            json={"filename": gcode_filename}
        )
        response.raise_for_status()
        return response.json()


async def cancel_print() -> dict:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.post(f"{_get_url()}/printer/print/cancel")
        response.raise_for_status()
        return response.json()


async def pause_print() -> dict:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.post(f"{_get_url()}/printer/print/pause")
        response.raise_for_status()
        return response.json()


async def resume_print() -> dict:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.post(f"{_get_url()}/printer/print/resume")
        response.raise_for_status()
        return response.json()
