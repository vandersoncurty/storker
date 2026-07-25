import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

from ..schemas import Settings, SettingsIntegrations

router = APIRouter(prefix="/settings", tags=["settings"])

SETTINGS_FILE = Path(__file__).resolve().parent.parent / "settings.json"


def _load() -> Settings:
    if SETTINGS_FILE.exists():
        data = json.loads(SETTINGS_FILE.read_text())
        return Settings(**data)
    return Settings()


def _save(settings: Settings) -> None:
    SETTINGS_FILE.write_text(settings.model_dump_json(indent=2))


@router.get("/", response_model=Settings)
def get_settings():
    return _load()


@router.put("/", response_model=Settings)
def update_settings(payload: Settings):
    _save(payload)
    return payload


@router.patch("/integrations", response_model=SettingsIntegrations)
def update_integrations(payload: SettingsIntegrations):
    settings = _load()
    settings.integrations = payload
    _save(settings)
    return settings.integrations
