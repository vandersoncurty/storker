"""Router de configurações - leitura e escrita de settings do sistema."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from .. import schemas
from .settings_file import load_settings, save_settings

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/", response_model=schemas.Settings)
def get_settings():
    """Retorna todas as configurações do sistema."""
    return load_settings()


@router.put("/", response_model=schemas.Settings)
def update_settings(payload: schemas.Settings):
    """Substitui todas as configurações do sistema."""
    save_settings(payload)
    return payload


@router.patch("/integrations", response_model=schemas.SettingsIntegrations)
def update_integrations(payload: schemas.SettingsIntegrations):
    """Atualiza apenas as configurações de integrações (PATCH parcial)."""
    settings = load_settings()
    settings.integrations = payload
    save_settings(settings)
    return settings.integrations
