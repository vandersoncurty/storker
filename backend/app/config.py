import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent
load_dotenv(BASE_DIR / ".env")

# Database
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'store.db'}")

# Moonraker (Klipper)
MOONRAKER_URL = os.getenv("MOONRAKER_URL", "http://localhost:7125")

# Spoolman
SPOOLMAN_URL = os.getenv("SPOOLMAN_URL", "http://localhost:7912")

# Thingiverse
THINGIVERSE_APP_TOKEN = os.getenv("THINGIVERSE_APP_TOKEN", "")
THINGIVERSE_BASE_URL = "https://api.thingiverse.com"

# Data directories
DATA_DIR = PROJECT_ROOT / "data"
THINGIVERSE_MODELS_DIR = DATA_DIR / "thingiverse_models"
PRODUCT_IMAGES_DIR = DATA_DIR / "product_images"

# CORS
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
