"""Persistência de configurações em settings.json."""

import json
from pathlib import Path

from ..schemas import Settings

SETTINGS_FILE = Path(__file__).resolve().parent.parent / "settings.json"


def load_settings() -> Settings:
    if SETTINGS_FILE.exists():
        data = json.loads(SETTINGS_FILE.read_text())
        return Settings(**data)
    return Settings()


def save_settings(settings: Settings) -> None:
    SETTINGS_FILE.write_text(settings.model_dump_json(indent=2))
