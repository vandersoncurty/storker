"""Router de impressoras - gestão de impressoras e status Moonraker."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas
from ..services.moonraker import (
    get_printer_info as mr_get_printer_info,
    get_print_stats as mr_get_print_stats,
    start_print as mr_start_print,
    cancel_print as mr_cancel_print,
    pause_print as mr_pause_print,
    resume_print as mr_resume_print,
)

router = APIRouter(prefix="/printers", tags=["printers"])


@router.get("/status")
async def printer_status():
    """Retorna status da impressora via Moonraker."""
    try:
        info = await mr_get_printer_info()
        result = info.get("result", {})
        return {
            "state": result.get("state", "unknown"),
            "hostname": result.get("hostname", ""),
            "firmware_version": result.get("firmware_version", ""),
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Moonraker offline: {e}")


@router.get("/stats")
async def print_stats():
    """Retorna estatísticas de impressão atual (temperaturas, progresso)."""
    try:
        stats = await mr_get_print_stats()
        status = stats.get("result", {}).get("status", {})
        ps = status.get("print_stats", {})
        ds = status.get("display_status", {})
        extruder = status.get("extruder", {})
        bed = status.get("heater_bed", {})
        gcode = status.get("gcode_move", {})

        total_duration = ps.get("total_duration", 0) or ps.get("print_duration", 0)
        progress = ds.get("progress", 0)
        if progress == 0 and total_duration > 0 and ps.get("print_duration"):
            progress = min(ps["print_duration"] / total_duration, 1) if total_duration else 0

        return {
            "state": ps.get("state", ""),
            "filename": ps.get("filename", ""),
            "total_duration": total_duration,
            "print_duration": ps.get("print_duration", 0),
            "filament_used": ps.get("filament_used", 0),
            "progress": round(progress * 100, 1),
            "extruder_temp": extruder.get("temperature", 0),
            "extruder_target": extruder.get("target", 0),
            "bed_temp": bed.get("temperature", 0),
            "bed_target": bed.get("target", 0),
            "position": {
                "x": gcode.get("gcode_position", [0, 0, 0])[0],
                "y": gcode.get("gcode_position", [0, 0, 0])[1],
                "z": gcode.get("gcode_position", [0, 0, 0])[2],
            },
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Moonraker offline: {e}")


@router.post("/print/start")
async def start_print(filename: str):
    """Inicia impressão de um GCode."""
    try:
        result = await mr_start_print(filename)
        return {"detail": "Impressão iniciada", "result": result}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Erro: {e}")


@router.post("/print/cancel")
async def cancel_print():
    """Cancela impressão."""
    try:
        await mr_cancel_print()
        return {"detail": "Impressão cancelada"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Erro: {e}")


@router.post("/print/pause")
async def pause_print():
    """Pausa impressão."""
    try:
        await mr_pause_print()
        return {"detail": "Impressão pausada"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Erro: {e}")


@router.post("/print/resume")
async def resume_print():
    """Retoma impressão."""
    try:
        await mr_resume_print()
        return {"detail": "Impressão retomada"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Erro: {e}")
