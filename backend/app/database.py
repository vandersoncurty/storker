import sqlite3
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import DATABASE_URL

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def _table_has_column(db_path: str, table: str, column: str) -> bool:
    if not Path(db_path.replace("sqlite:///", "")).exists():
        return False
    try:
        conn = sqlite3.connect(db_path.replace("sqlite:///", ""))
        cursor = conn.execute(f"PRAGMA table_info({table})")
        columns = [row[1] for row in cursor]
        conn.close()
        return column in columns
    except Exception:
        return False


def check_and_migrate():
    """Recria tabelas se o schema estiver desatualizado (dev only)."""
    db_file = DATABASE_URL.replace("sqlite:///", "")
    if not Path(db_file).exists():
        Base.metadata.create_all(bind=engine)
        return

    if not _table_has_column(DATABASE_URL, "products", "title"):
        Path(db_file).unlink()
        Base.metadata.create_all(bind=engine)
        return

    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
