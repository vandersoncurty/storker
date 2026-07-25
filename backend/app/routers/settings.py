"""Router de configurações - leitura e escrita de settings do sistema."""

from fastapi import APIRouter

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


@router.patch("/moonraker", response_model=schemas.SettingsMoonraker)
def update_moonraker(payload: schemas.SettingsMoonraker):
    """Atualiza apenas as configurações do Moonraker."""
    settings = load_settings()
    settings.moonraker = payload
    save_settings(settings)
    return settings.moonraker


@router.patch("/spoolman", response_model=schemas.SettingsSpoolman)
def update_spoolman(payload: schemas.SettingsSpoolman):
    """Atualiza apenas as configurações do Spoolman."""
    settings = load_settings()
    settings.spoolman = payload
    save_settings(settings)
    return settings.spoolman


@router.patch("/thingiverse", response_model=schemas.SettingsThingiverse)
def update_thingiverse(payload: schemas.SettingsThingiverse):
    """Atualiza apenas as configurações do Thingiverse."""
    settings = load_settings()
    settings.thingiverse = payload
    save_settings(settings)
    return settings.thingiverse
