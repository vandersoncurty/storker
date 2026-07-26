"""Persistência de configurações em storker.conf (INI padrão)."""

import configparser
import json
from pathlib import Path

from ..config import DATA_DIR
from ..schemas import (
    Settings, SettingsMoonraker, SettingsSpoolman,
    SettingsThingiverse, SettingsStore, SettingsPrinters, SettingsCosts,
    SettingsFinance,
)

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


def load_users() -> dict:
    """Carrega usuários do storker.conf. Retorna dict {username: password_hash}."""
    if not SETTINGS_FILE.exists():
        return {}
    parser = configparser.ConfigParser()
    parser.read(SETTINGS_FILE)
    if parser.has_section("users"):
        return dict(parser["users"])
    return {}


def save_users(users: dict) -> None:
    """Salva usuários no storker.conf."""
    SETTINGS_DIR.mkdir(parents=True, exist_ok=True)
    parser = configparser.ConfigParser()
    if SETTINGS_FILE.exists():
        parser.read(SETTINGS_FILE)
    if "users" in parser:
        parser.remove_section("users")
    parser["users"] = users
    with open(SETTINGS_FILE, "w") as f:
        parser.write(f)


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
        store=SettingsStore(
            name=parser.get("store", "name", fallback="Minha Loja 3D"),
            currency=parser.get("store", "currency", fallback="BRL"),
            tax_rate=parser.getfloat("store", "tax_rate", fallback=0.0),
            markup_percentage=parser.getfloat("store", "markup_percentage", fallback=30.0),
        ),
        printers=SettingsPrinters(
            default_server=parser.get("printers", "default_server", fallback="http://localhost:7125"),
        ),
        costs=SettingsCosts(
            kwh_rate=parser.getfloat("costs", "kwh_rate", fallback=0.95),
            printer_watts=parser.getint("costs", "printer_watts", fallback=250),
            labor_cost_per_hour=parser.getfloat("costs", "labor_cost_per_hour", fallback=0.0),
            fixed_cost_per_print=parser.getfloat("costs", "fixed_cost_per_print", fallback=0.0),
            ecommerce_fee_percent=parser.getfloat("costs", "ecommerce_fee_percent", fallback=0.0),
            profit_margin_percent=parser.getfloat("costs", "profit_margin_percent", fallback=30.0),
            shopee_commission_pct=parser.getfloat("costs", "shopee_commission_pct", fallback=20.0),
            shopee_fixed_fee=parser.getfloat("costs", "shopee_fixed_fee", fallback=3.0),
            shopee_commission_cap=parser.getfloat("costs", "shopee_commission_cap", fallback=100.0),
            shopee_tax_pct=parser.getfloat("costs", "shopee_tax_pct", fallback=0.0),
        ),
        finance=SettingsFinance(
            categories_income=parser.get("finance", "categories_income", fallback="Venda"),
            categories_expense=parser.get("finance", "categories_expense", fallback="Filamento,Energia,Embalagem,Frete,Taxa,Outro"),
            initial_balance=parser.getfloat("finance", "initial_balance", fallback=0.0),
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
    parser["store"] = {
        "name": settings.store.name,
        "currency": settings.store.currency,
        "tax_rate": str(settings.store.tax_rate),
        "markup_percentage": str(settings.store.markup_percentage),
    }
    parser["printers"] = {
        "default_server": settings.printers.default_server,
    }
    parser["costs"] = {
        "kwh_rate": str(settings.costs.kwh_rate),
        "printer_watts": str(settings.costs.printer_watts),
        "labor_cost_per_hour": str(settings.costs.labor_cost_per_hour),
        "fixed_cost_per_print": str(settings.costs.fixed_cost_per_print),
        "ecommerce_fee_percent": str(settings.costs.ecommerce_fee_percent),
        "profit_margin_percent": str(settings.costs.profit_margin_percent),
        "shopee_commission_pct": str(settings.costs.shopee_commission_pct),
        "shopee_fixed_fee": str(settings.costs.shopee_fixed_fee),
        "shopee_commission_cap": str(settings.costs.shopee_commission_cap),
        "shopee_tax_pct": str(settings.costs.shopee_tax_pct),
    }
    parser["finance"] = {
        "categories_income": settings.finance.categories_income,
        "categories_expense": settings.finance.categories_expense,
        "initial_balance": str(settings.finance.initial_balance),
    }

    with open(SETTINGS_FILE, "w") as f:
        parser.write(f)
