"""Router de jobs - fila de impressão do Moonraker e submissão de GCode."""

from fastapi import APIRouter, HTTPException

from ..services.moonraker import (
    get_job_queue as mr_get_queue,
    post_job_queue as mr_post_job,
    upload_file_to_moonraker,
    get_directory,
)

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/queue")
async def job_queue():
    """Retorna a fila de impressão do Moonraker."""
    try:
        queue = await mr_get_queue()
        return {"queue": queue}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Moonraker offline: {e}")


@router.get("/gcodes")
async def list_gcodes():
    """Lista arquivos GCode disponíveis no Moonraker."""
    try:
        files = await get_directory("gcodes")
        return {"files": files.get("result", [])}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Moonraker offline: {e}")


@router.post("/queue")
async def add_to_queue(filename: str):
    """Adiciona um GCode à fila de impressão do Moonraker."""
    try:
        result = await mr_post_job(filename)
        return {"detail": "Adicionado à fila", "result": result}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Erro: {e}")
