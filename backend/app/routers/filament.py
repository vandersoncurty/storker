"""Router de filamento - integração com Spoolman."""

from fastapi import APIRouter, HTTPException

from ..services.spoolman import list_spools, get_spool, get_filament_usage, list_filaments

router = APIRouter(prefix="/filament", tags=["filament"])


@router.get("/spools")
async def spools():
    """Lista todos os spools do Spoolman."""
    try:
        data = await list_spools()
        return {"spools": data}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Spoolman offline: {e}")


@router.get("/spools/{spool_id}")
async def spool_detail(spool_id: int):
    """Detalhes de um spool."""
    try:
        data = await get_spool(spool_id)
        return data
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Spoolman offline: {e}")


@router.get("/filaments")
async def filaments():
    """Lista tipos de filamento do Spoolman."""
    try:
        data = await list_filaments()
        return {"filaments": data}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Spoolman offline: {e}")
