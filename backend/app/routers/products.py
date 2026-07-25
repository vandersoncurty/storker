"""Router de produtos - CRUD, imagens e gestão de catálogo."""

import mimetypes
import shutil
import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session

from ..config import PRODUCT_IMAGES_DIR
from ..database import get_db
from .. import models, schemas

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

router = APIRouter(prefix="/products", tags=["products"])


@router.post("/", response_model=schemas.ProductResponse)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    """Cria um novo produto no catálogo."""
    db_product = models.Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@router.get("/", response_model=List[schemas.ProductResponse])
def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: str = Query(None, description="Filtro por título (case-insensitive)"),
    is_sliced: bool = Query(None, description="Filtrar por status de fatiamento"),
    db: Session = Depends(get_db),
):
    """Lista todos os produtos, ordenados por data de criação (mais recente primeiro)."""
    q = db.query(models.Product)
    if search:
        q = q.filter(models.Product.title.ilike(f"%{search}%"))
    if is_sliced is not None:
        q = q.filter(models.Product.is_sliced == is_sliced)
    return q.order_by(models.Product.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{product_id}", response_model=schemas.ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Busca um produto por ID, incluindo suas imagens."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return product


@router.patch("/{product_id}", response_model=schemas.ProductResponse)
def update_product(product_id: int, payload: schemas.ProductUpdate, db: Session = Depends(get_db)):
    """Atualiza campos de um produto. Apenas campos enviados são alterados (PATCH parcial)."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    """Remove um produto e todas as suas imagens."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    db.delete(product)
    db.commit()
    return {"detail": "Produto removido"}


@router.post("/{product_id}/images/upload", response_model=schemas.ProductImageResponse)
async def upload_image(product_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Envia uma imagem para o produto. Se for a primeira imagem, ela vira a principal automaticamente."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail=f"Formato não suportado. Use: {', '.join(ALLOWED_IMAGE_TYPES)}")

    PRODUCT_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename).suffix or ".jpg"
    filename = f"{product_id}_{uuid.uuid4().hex[:8]}{ext}"
    dest = PRODUCT_IMAGES_DIR / filename

    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    has_primary = db.query(models.ProductImage).filter(
        models.ProductImage.product_id == product_id,
        models.ProductImage.is_primary == True,
    ).first()

    image = models.ProductImage(
        product_id=product_id,
        file_path=str(dest),
        source="upload",
        is_primary=(not has_primary),
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


@router.patch("/{product_id}/images/{image_id}/primary")
def set_primary_image(product_id: int, image_id: int, db: Session = Depends(get_db)):
    """Define uma imagem como principal do produto. Desfaz a marcação da anterior."""
    image = db.query(models.ProductImage).filter(
        models.ProductImage.id == image_id,
        models.ProductImage.product_id == product_id,
    ).first()
    if not image:
        raise HTTPException(status_code=404, detail="Imagem não encontrada")

    db.query(models.ProductImage).filter(
        models.ProductImage.product_id == product_id,
    ).update({"is_primary": False})

    image.is_primary = True
    db.commit()
    return {"detail": "Imagem principal definida"}


@router.delete("/{product_id}/images/{image_id}")
def delete_image(product_id: int, image_id: int, db: Session = Depends(get_db)):
    """Remove uma imagem do produto. Se era a principal, a próxima vira principal."""
    image = db.query(models.ProductImage).filter(
        models.ProductImage.id == image_id,
        models.ProductImage.product_id == product_id,
    ).first()
    if not image:
        raise HTTPException(status_code=404, detail="Imagem não encontrada")

    if image.is_primary:
        other = db.query(models.ProductImage).filter(
            models.ProductImage.product_id == product_id,
            models.ProductImage.id != image_id,
        ).first()
        if other:
            other.is_primary = True

    file_path = Path(image.file_path)
    if file_path.exists():
        file_path.unlink()

    db.delete(image)
    db.commit()
    return {"detail": "Imagem removida"}
