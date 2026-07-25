"""Persistência de configurações em storker.conf (INI padrão)."""

import configparser
import json
from pathlib import Path

from ..config import DATA_DIR
from ..schemas import Settings, SettingsMoonraker, SettingsSpoolman, SettingsThingiverse

SETTINGS_DIR = DATA_DIR / "config"
SETTINGS_FILE = SETTINGS_DIR / "storker.conf"


def _migrate_json_if_needed() -> None:
    """Migra settings.json antigo para storker.conf INI (uma vez)."""
    if SETTINGS_FILE.exists():
        return
    old_json = SETTINGS_DIR / "settings.json"
    old_app_json = Path(__file__).resolve().parent.parent / "settings.json"
    for old_path in (old_json, old_app_json):
        if old_path.exists():
            try:
                data = json.loads(old_path.read_text())
                integ = data.get("integrations", {})
                settings = Settings(
                    moonraker=SettingsMoonraker(server=integ.get("moonraker_url", "http://localhost:7125")),
                    spoolman=SettingsSpoolman(server=integ.get("spoolman_url", "http://localhost:7912")),
                    thingiverse=SettingsThingiverse(
                        download_dir=integ.get("thingiverse_download_dir", "data/thingiverse_models"),
                        sync_interval=integ.get("thingiverse_sync_interval", 0),
                        app_token=integ.get("thingiverse_app_token", ""),
                    ),
                )
                save_settings(settings)
                old_path.unlink()
                return
            except (json.JSONDecodeError, KeyError):
                pass


def load_settings() -> Settings:
    _migrate_json_if_needed()

    if not SETTINGS_FILE.exists():
        return Settings()

    parser = configparser.ConfigParser()
    parser.read(SETTINGS_FILE)

    return Settings(
        moonraker=SettingsMoonraker(
            server=parser.get("moonraker", "server", fallback="http://localhost:7125"),
        ),
        spoolman=SettingsSpoolman(
            server=parser.get("spoolman", "server", fallback="http://localhost:7912"),
        ),
        thingiverse=SettingsThingiverse(
            download_dir=parser.get("thingiverse", "download_dir", fallback="data/thingiverse_models"),
            sync_interval=parser.getint("thingiverse", "sync_interval", fallback=0),
            app_token=parser.get("thingiverse", "app_token", fallback=""),
        ),
    )


def save_settings(settings: Settings) -> None:
    SETTINGS_DIR.mkdir(parents=True, exist_ok=True)

    parser = configparser.ConfigParser()
    parser["moonraker"] = {"server": settings.moonraker.server}
    parser["spoolman"] = {"server": settings.spoolman.server}
    parser["thingiverse"] = {
        "download_dir": settings.thingiverse.download_dir,
        "sync_interval": str(settings.thingiverse.sync_interval),
        "app_token": settings.thingiverse.app_token,
    }

    with open(SETTINGS_FILE, "w") as f:
        parser.write(f)
