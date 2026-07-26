import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent

# Load .env: project root first, then backend dir (overrides)
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(BASE_DIR / ".env")

# Database — explicit DATABASE_URL wins, otherwise build from DB_* vars
_explicit_url = os.getenv("DATABASE_URL")
if _explicit_url:
    DATABASE_URL = _explicit_url
else:
    _db_host = os.getenv("DB_HOST")
    if _db_host:
        _db_port = os.getenv("DB_PORT", "5432")
        _db_user = os.getenv("DB_USER", "postgres")
        _db_pass = os.getenv("DB_PASSWORD", "")
        _db_name = os.getenv("DB_NAME", "storker_db")
        DATABASE_URL = f"postgresql://{_db_user}:{_db_pass}@{_db_host}:{_db_port}/{_db_name}"
    else:
        DATABASE_URL = f"sqlite:///{BASE_DIR / 'store.db'}"

# Moonraker (Klipper)
MOONRAKER_URL = os.getenv("MOONRAKER_URL", "http://localhost:7125")

# Spoolman
SPOOLMAN_URL = os.getenv("SPOOLMAN_URL", "http://localhost:7912")

# Thingiverse
THINGIVERSE_APP_TOKEN = os.getenv("THINGIVERSE_APP_TOKEN", "")
THINGIVERSE_BASE_URL = "https://api.thingiverse.com"

# Data directories (inside backend, mapeável via Docker volume)
DATA_DIR = BASE_DIR / "data"
THINGIVERSE_MODELS_DIR = DATA_DIR / "thingiverse_models"
PRODUCT_IMAGES_DIR = DATA_DIR / "product_images"
UPLOADED_MODELS_DIR = DATA_DIR / "uploaded_models"
GCODES_DIR = DATA_DIR / "gcodes"

# CORS
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
