"""Serviço de sincronização Thingiverse - baixa STLs, imagens e cria Products."""

from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import Session

from ..config import THINGIVERSE_MODELS_DIR, PRODUCT_IMAGES_DIR
from ..models import Product, ProductImage, ThingiverseCollectionConfig, ThingiverseSync, StlProject, StlFile
from ..schemas import SyncResult
from . import thingiverse
from .settings_file import load_settings


def _get_download_dir() -> Path:
    settings = load_settings()
    raw = settings.thingiverse.download_dir
    path = Path(raw)
    if not path.is_absolute():
        path = Path(__file__).resolve().parent.parent.parent / raw
    path.mkdir(parents=True, exist_ok=True)
    return path


def _get_images_dir() -> Path:
    PRODUCT_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    return PRODUCT_IMAGES_DIR


def _files_exist(local_path: str) -> bool:
    """Verifica se os arquivos STL ainda existem no disco."""
    if not local_path:
        return False
    path = Path(local_path)
    if not path.exists():
        return False
    stl_files = list(path.glob("*.stl"))
    return len(stl_files) > 0


def _extract_image_url(img: dict) -> str:
    """Extrai URL de melhor resolução de uma imagem Thingiverse.

    sizes é uma lista de dicts [{type, size, url}].
    Prioriza: preview/large > thumb/large > url direta.
    """
    sizes = img.get("sizes", [])
    if isinstance(sizes, list):
        for s in sizes:
            if s.get("type") == "preview" and s.get("size") == "large":
                return s.get("url", "")
        for s in sizes:
            if s.get("type") == "thumb" and s.get("size") == "large":
                return s.get("url", "")
        if sizes:
            return sizes[0].get("url", "")
    return img.get("url", "")


async def sync_collection(collection_id: int, db: Session) -> SyncResult:
    """Sincroniza uma collection: busca things, baixa STLs+imagens, cria Products."""
    download_dir = _get_download_dir()
    images_dir = _get_images_dir()

    sync_records = {
        r.thing_id: r
        for r in db.query(ThingiverseSync).all()
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

            existing = sync_records.get(thing_id)
            if existing and existing.status == "DOWNLOADED" and _files_exist(existing.local_path):
                existing_stl_project = db.query(StlProject).filter(StlProject.thing_id == thing_id).first()
                if existing_stl_project:
                    skipped += 1
                    continue
                safe_name = thing_name.replace(" ", "_").replace("/", "-")[:100]
                thing_dir = Path(existing.local_path)
                if not thing_dir.exists():
                    skipped += 1
                    continue
                stl_proj = StlProject(
                    name=safe_name,
                    path=str(thing_dir),
                    source="thingiverse",
                    info_pending=False,
                    title=thing_name,
                    description="",
                    thing_id=thing_id,
                )
                db.add(stl_proj)
                db.flush()
                for stl_path in thing_dir.glob("*.stl"):
                    db.add(StlFile(
                        project_id=stl_proj.id,
                        filename=stl_path.name,
                        file_path=str(stl_path),
                        file_type="stl",
                    ))
                db.commit()
                skipped += 1
                continue

            if existing:
                db.delete(existing)
                db.flush()

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
                    stl_dest = thing_dir / stl["name"]
                    if stl_dest.exists():
                        continue
                    content = await thingiverse.download_file(stl["download_url"])
                    stl_dest.write_bytes(content)

                existing_product = db.query(Product).filter(Product.thing_id == thing_id).first()
                if existing_product:
                    product = existing_product
                    product.title = thing_name
                    product.description = description
                    product.thing_url = thing_url
                    product.local_path = str(thing_dir)
                else:
                    product = Product(
                        title=thing_name,
                        description=description,
                        thing_id=thing_id,
                        thing_url=thing_url,
                        local_path=str(thing_dir),
                    )
                    db.add(product)
                db.flush()

                existing_stl_project = db.query(StlProject).filter(StlProject.thing_id == thing_id).first()
                if not existing_stl_project:
                    stl_proj = StlProject(
                        name=safe_name,
                        path=str(thing_dir),
                        source="thingiverse",
                        info_pending=False,
                        title=thing_name,
                        description=description,
                        thing_id=thing_id,
                    )
                    db.add(stl_proj)
                    db.flush()
                    for stl in stl_files:
                        stl_path = thing_dir / stl["name"]
                        if stl_path.exists():
                            db.add(StlFile(
                                project_id=stl_proj.id,
                                filename=stl["name"],
                                file_path=str(stl_path),
                                file_type="stl",
                            ))

                try:
                    tv_images = await thingiverse.get_thing_images(thing_id)
                except Exception:
                    tv_images = []

                existing_images = {
                    img.original_url: img
                    for img in db.query(ProductImage).filter(
                        ProductImage.product_id == product.id,
                        ProductImage.source == "thingiverse",
                    ).all()
                }

                for idx, img in enumerate(tv_images):
                    try:
                        img_url = _extract_image_url(img)
                        if not img_url:
                            continue

                        if img_url in existing_images:
                            continue

                        img_data = await thingiverse.download_file(img_url)
                        ext = ".jpg"
                        img_filename = f"{safe_name}_{idx}{ext}"
                        img_path = images_dir / img_filename
                        img_path.write_bytes(img_data)

                        has_primary = db.query(ProductImage).filter(
                            ProductImage.product_id == product.id,
                            ProductImage.is_primary == True,
                        ).first()

                        product_image = ProductImage(
                            product_id=product.id,
                            file_path=str(img_path),
                            original_url=img_url,
                            source="thingiverse",
                            is_primary=(not has_primary and idx == 0),
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
                sync_records[thing_id] = sync_record
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
                sync_records[thing_id] = sync_record
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
