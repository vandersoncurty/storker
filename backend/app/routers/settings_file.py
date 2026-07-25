"""Persistência de configurações em storker.conf."""

import json
from pathlib import Path

from ..config import DATA_DIR
from ..schemas import Settings

SETTINGS_DIR = DATA_DIR / "config"
SETTINGS_FILE = SETTINGS_DIR / "storker.conf"


def load_settings() -> Settings:
    if SETTINGS_FILE.exists():
        data = json.loads(SETTINGS_FILE.read_text())
        return Settings(**data)
    return Settings()


def save_settings(settings: Settings) -> None:
    SETTINGS_DIR.mkdir(parents=True, exist_ok=True)
    SETTINGS_FILE.write_text(settings.model_dump_json(indent=2))
