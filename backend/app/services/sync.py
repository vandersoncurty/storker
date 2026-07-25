"""Serviço de sincronização Thingiverse - baixa STLs de collections configuradas."""

import json
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from ..models import ThingiverseCollectionConfig, ThingiverseSync
from ..schemas import SyncResult
from . import thingiverse


def _load_settings() -> dict:
    settings_path = Path(__file__).resolve().parent.parent / "settings.json"
    if settings_path.exists():
        return json.loads(settings_path.read_text())
    return {}


def _get_download_dir() -> Path:
    settings = _load_settings()
    integrations = settings.get("integrations", {})
    raw = integrations.get("thingiverse_download_dir", "./models")
    path = Path(raw)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _get_thing_ids_by_collection(db: Session) -> dict[int, list[int]]:
    """Retorna thing_ids já baixados, agrupados por collection_id."""
    rows = db.query(ThingiverseSync.thing_id).all()
    return {r.thing_id for r in rows}


async def sync_collection(collection_id: int, db: Session) -> SyncResult:
    """Sincroniza uma collection: busca things, baixa novos, registra no banco."""
    download_dir = _get_download_dir()
    existing_ids = _get_thing_ids_by_collection(db)

    page = 1
    downloaded = 0
    skipped = 0
    failed = 0

    while True:
        things = await thingiverse.get_collection_things(collection_id, page=page)
        if not things:
            break

        for thing in things:
            thing_id = thing["id"]
            thing_name = thing.get("name", f"thing_{thing_id}")
            thing_url = thing.get("public_url", "")

            if thing_id in existing_ids:
                skipped += 1
                continue

            try:
                files = await thingiverse.get_thing_files(thing_id)
                stl_files = [f for f in files if f["name"].lower().endswith(".stl")]

                if not stl_files:
                    skipped += 1
                    continue

                thing_dir = download_dir / thing_name.replace(" ", "_").replace("/", "-")
                thing_dir.mkdir(parents=True, exist_ok=True)

                for stl in stl_files:
                    content = await thingiverse.download_file(stl["download_url"])
                    (thing_dir / stl["name"]).write_bytes(content)

                sync_record = ThingiverseSync(
                    thing_id=thing_id,
                    thing_name=thing_name,
                    thing_url=thing_url,
                    local_path=str(thing_dir),
                    status="DOWNLOADED",
                )
                db.add(sync_record)
                existing_ids.add(thing_id)
                downloaded += 1

            except Exception as e:
                sync_record = ThingiverseSync(
                    thing_id=thing_id,
                    thing_name=thing_name,
                    thing_url=thing_url,
                    local_path="",
                    status="FAILED",
                )
                db.add(sync_record)
                failed += 1

        page += 1

    config = db.query(ThingiverseCollectionConfig).filter(
        ThingiverseCollectionConfig.collection_id == collection_id
    ).first()
    if config:
        config.last_synced_at = datetime.utcnow()

    db.commit()

    return SyncResult(
        collection_id=collection_id,
        downloaded=downloaded,
        skipped=skipped,
        failed=failed,
    )


async def sync_all(db: Session) -> list[SyncResult]:
    """Sincroniza todas as collections configuradas."""
    configs = db.query(ThingiverseCollectionConfig).all()
    results = []
    for cfg in configs:
        result = await sync_collection(cfg.collection_id, db)
        results.append(result)
    return results
