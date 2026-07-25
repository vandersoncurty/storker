"""Serviço de sincronização Thingiverse - baixa STLs, imagens e cria Products."""

import json
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from ..config import THINGIVERSE_MODELS_DIR, PRODUCT_IMAGES_DIR
from ..models import Product, ProductImage, ThingiverseCollectionConfig, ThingiverseSync
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
    raw = integrations.get("thingiverse_download_dir", str(THINGIVERSE_MODELS_DIR))
    path = Path(raw)
    if not path.is_absolute():
        path = Path(__file__).resolve().parent.parent.parent / raw
    path.mkdir(parents=True, exist_ok=True)
    return path


def _get_images_dir() -> Path:
    PRODUCT_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    return PRODUCT_IMAGES_DIR


async def sync_collection(collection_id: int, db: Session) -> SyncResult:
    """Sincroniza uma collection: busca things, baixa STLs+imagens, cria Products."""
    download_dir = _get_download_dir()
    images_dir = _get_images_dir()

    existing_ids = {
        r.thing_id for r in db.query(ThingiverseSync.thing_id).all()
    }

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
                detail = await thingiverse.get_thing(thing_id)
                description = detail.get("description", "") or ""
                if len(description) > 5000:
                    description = description[:5000]

                files = await thingiverse.get_thing_files(thing_id)
                stl_files = [f for f in files if f["name"].lower().endswith(".stl")]

                if not stl_files:
                    skipped += 1
                    continue

                safe_name = thing_name.replace(" ", "_").replace("/", "-")[:100]
                thing_dir = download_dir / safe_name
                thing_dir.mkdir(parents=True, exist_ok=True)

                for stl in stl_files:
                    content = await thingiverse.download_file(stl["download_url"])
                    (thing_dir / stl["name"]).write_bytes(content)

                product = Product(
                    title=thing_name,
                    description=description,
                    thing_id=thing_id,
                    thing_url=thing_url,
                    local_path=str(thing_dir),
                )
                db.add(product)
                db.flush()

                try:
                    tv_images = await thingiverse.get_thing_images(thing_id)
                except Exception:
                    tv_images = []

                for idx, img in enumerate(tv_images):
                    try:
                        img_url = img.get("sizes", {}).get("large", {}).get("url") or img.get("url", "")
                        if not img_url:
                            continue
                        img_data = await thingiverse.download_file(img_url)
                        ext = ".jpg"
                        img_filename = f"{safe_name}_{idx}{ext}"
                        img_path = images_dir / img_filename
                        img_path.write_bytes(img_data)

                        product_image = ProductImage(
                            product_id=product.id,
                            file_path=str(img_path),
                            original_url=img_url,
                            source="thingiverse",
                            is_primary=(idx == 0),
                        )
                        db.add(product_image)
                    except Exception:
                        continue

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

            except Exception:
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
