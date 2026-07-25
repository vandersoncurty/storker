from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ThingiverseCollectionConfig, ThingiverseSync
from ..schemas import (
    ThingiverseCollectionCreate,
    ThingiverseCollectionResponse,
    ThingiverseSyncResponse,
    SyncResponse,
)
from ..services import sync

router = APIRouter(prefix="/thingiverse", tags=["thingiverse"])


@router.get("/collections", response_model=List[ThingiverseCollectionResponse])
def list_collections(db: Session = Depends(get_db)):
    return db.query(ThingiverseCollectionConfig).all()


@router.post("/collections", response_model=ThingiverseCollectionResponse)
def add_collection(payload: ThingiverseCollectionCreate, db: Session = Depends(get_db)):
    existing = db.query(ThingiverseCollectionConfig).filter(
        ThingiverseCollectionConfig.collection_id == payload.collection_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Collection já configurada")
    cfg = ThingiverseCollectionConfig(**payload.model_dump())
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return cfg


@router.delete("/collections/{collection_id}")
def remove_collection(collection_id: int, db: Session = Depends(get_db)):
    cfg = db.query(ThingiverseCollectionConfig).filter(
        ThingiverseCollectionConfig.collection_id == collection_id
    ).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Collection não encontrada")
    db.delete(cfg)
    db.commit()
    return {"detail": "Collection removida"}


@router.get("/downloads", response_model=List[ThingiverseSyncResponse])
def list_downloads(db: Session = Depends(get_db)):
    return db.query(ThingiverseSync).order_by(ThingiverseSync.synced_at.desc()).all()


@router.post("/sync", response_model=SyncResponse)
async def trigger_sync(db: Session = Depends(get_db)):
    results = await sync.sync_all(db)
    total_downloaded = sum(r.downloaded for r in results)
    total_skipped = sum(r.skipped for r in results)
    total_failed = sum(r.failed for r in results)
    return SyncResponse(
        results=results,
        total_downloaded=total_downloaded,
        total_skipped=total_skipped,
        total_failed=total_failed,
    )


@router.post("/sync/{collection_id}", response_model=SyncResponse)
async def trigger_sync_collection(collection_id: int, db: Session = Depends(get_db)):
    result = await sync.sync_collection(collection_id, db)
    return SyncResponse(
        results=[result],
        total_downloaded=result.downloaded,
        total_skipped=result.skipped,
        total_failed=result.failed,
    )
