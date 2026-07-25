import shutil
import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from ..config import PRODUCT_IMAGES_DIR
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/products", tags=["products"])


@router.post("/", response_model=schemas.ProductResponse)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    db_product = models.Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@router.get("/", response_model=List[schemas.ProductResponse])
def list_products(db: Session = Depends(get_db)):
    return db.query(models.Product).order_by(models.Product.created_at.desc()).all()


@router.get("/{product_id}", response_model=schemas.ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return product


@router.patch("/{product_id}", response_model=schemas.ProductResponse)
def update_product(product_id: int, payload: schemas.ProductUpdate, db: Session = Depends(get_db)):
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
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    db.delete(product)
    db.commit()
    return {"detail": "Produto removido"}


@router.post("/{product_id}/images/upload", response_model=schemas.ProductImageResponse)
async def upload_image(product_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

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
