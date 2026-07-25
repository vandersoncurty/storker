import os
from pathlib import Path

# Diretório base do projeto
BASE_DIR = Path(__file__).resolve().parent.parent

# Database
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'store.db'}")

# Moonraker (Klipper)
MOONRAKER_URL = os.getenv("MOONRAKER_URL", "http://localhost:7125")

# Spoolman
SPOOLMAN_URL = os.getenv("SPOOLMAN_URL", "http://localhost:7912")

# CORS
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
