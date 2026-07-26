"""Router de configurações - leitura e escrita de settings do sistema."""

from fastapi import APIRouter

from .. import schemas
from ..services.settings_file import load_settings, save_settings

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


@router.patch("/store", response_model=schemas.SettingsStore)
def update_store(payload: schemas.SettingsStore):
    """Atualiza apenas as configurações da loja."""
    settings = load_settings()
    settings.store = payload
    save_settings(settings)
    return settings.store


@router.patch("/printers", response_model=schemas.SettingsPrinters)
def update_printers(payload: schemas.SettingsPrinters):
    """Atualiza apenas as configurações de impressoras."""
    settings = load_settings()
    settings.printers = payload
    save_settings(settings)
    return settings.printers


@router.patch("/costs", response_model=schemas.SettingsCosts)
def update_costs(payload: schemas.SettingsCosts):
    """Atualiza apenas as configurações de custos."""
    settings = load_settings()
    settings.costs = payload
    save_settings(settings)
    return settings.costs


@router.patch("/finance", response_model=schemas.SettingsFinance)
def update_finance(payload: schemas.SettingsFinance):
    """Atualiza apenas as configurações financeiras."""
    settings = load_settings()
    settings.finance = payload
    save_settings(settings)
    return settings.finance
