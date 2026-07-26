from pathlib import Path

from .config import DATA_DIR


def rel(path: str | Path) -> str:
    p = Path(path)
    try:
        return str(p.relative_to(DATA_DIR))
    except ValueError:
        return str(p)


def abs_path(path: str | Path) -> Path:
    p = Path(path)
    if p.is_absolute():
        return p
    return (DATA_DIR / p).resolve()
