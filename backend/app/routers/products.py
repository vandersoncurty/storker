"""Router de produtos - CRUD, imagens, variantes e gestão de catálogo."""

import io
import os
import shutil
import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from PIL import Image
from sqlalchemy.orm import Session

from ..config import PRODUCT_IMAGES_DIR
from ..database import get_db
from .. import models, schemas
from ..paths import rel, abs_path
from ..services.settings_file import load_settings
from ..services.spoolman import get_spool
from .costs import CostEstimate, estimate_cost, ShopeeEstimate, calculate_shopee_price

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

MAX_IMAGE_DIMENSION = 1920
JPEG_QUALITY = 85

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
    """Remove um produto, suas imagens e arquivos no disco."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    for img in product.images:
        file_path = abs_path(img.file_path)
        if file_path.exists():
            os.remove(file_path)
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

    image_data = await file.read()
    img = Image.open(io.BytesIO(image_data))
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    orig_w, orig_h = img.size
    if orig_w > MAX_IMAGE_DIMENSION or orig_h > MAX_IMAGE_DIMENSION:
        ratio = min(MAX_IMAGE_DIMENSION / orig_w, MAX_IMAGE_DIMENSION / orig_h)
        img = img.resize((int(orig_w * ratio), int(orig_h * ratio)), Image.LANCZOS)

    filename = f"{product_id}_{uuid.uuid4().hex[:8]}.jpg"
    dest = PRODUCT_IMAGES_DIR / filename
    img.save(dest, "JPEG", quality=JPEG_QUALITY, optimize=True)

    has_primary = db.query(models.ProductImage).filter(
        models.ProductImage.product_id == product_id,
        models.ProductImage.is_primary == True,
    ).first()

    image = models.ProductImage(
        product_id=product_id,
        file_path=rel(dest),
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

    file_path = abs_path(image.file_path)
    if file_path.exists():
        file_path.unlink()

    db.delete(image)
    db.commit()
    return {"detail": "Imagem removida"}


def _calc_variant_price(product: models.Product, filament_price_per_kg: float,
                        additional_cost: float = 0.0, batch_size: int = 1,
                        shopee: bool = False) -> dict:
    settings = load_settings()
    costs = settings.costs
    payload = CostEstimate(
        filament_grams=product.filament_grams or 0,
        print_time_seconds=product.print_time_seconds or 0,
        filament_price_per_kg=filament_price_per_kg,
        printer_watts=costs.printer_watts,
        kwh_rate=costs.kwh_rate,
        labor_cost_per_hour=costs.labor_cost_per_hour,
        fixed_cost_per_print=costs.fixed_cost_per_print,
        ecommerce_fee_percent=costs.ecommerce_fee_percent,
        profit_margin_percent=costs.profit_margin_percent,
        taxes_fees=product.taxes_fees or 0,
    )
    base = estimate_cost(payload)
    batch_prod_cost = base.production_cost * batch_size + additional_cost

    if shopee:
        shopee_payload = ShopeeEstimate(
            production_cost=batch_prod_cost,
            profit_margin_percent=costs.profit_margin_percent,
            shopee_commission_pct=costs.shopee_commission_pct,
            shopee_fixed_fee=costs.shopee_fixed_fee,
            shopee_commission_cap=costs.shopee_commission_cap,
            shopee_tax_pct=costs.shopee_tax_pct,
        )
        shopee_result = calculate_shopee_price(shopee_payload)
        return {
            "production_cost": round(batch_prod_cost, 2),
            "sale_price": shopee_result.sale_price,
            "shopee_result": shopee_result.model_dump(),
        }

    final_price = base.final_price * batch_size + additional_cost
    return {"production_cost": round(batch_prod_cost, 2), "sale_price": round(final_price, 2)}


@router.post("/{product_id}/variants", response_model=schemas.ProductVariantResponse)
async def create_variant(product_id: int, payload: schemas.ProductVariantCreate, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    filament_price = payload.filament_price_per_kg
    spool_id = payload.spool_id or payload.filament_spool_id
    if spool_id:
        try:
            spool = await get_spool(spool_id)
            if spool.get("price") and spool.get("initial_weight"):
                filament_price = spool["price"] / spool["initial_weight"] * 1000
        except Exception:
            pass

    prices = _calc_variant_price(product, filament_price, payload.additional_cost,
                                 payload.batch_size, shopee=payload.shopee)

    variant = models.ProductVariant(
        product_id=product_id,
        name=payload.name,
        filament_price_per_kg=filament_price,
        spool_id=spool_id,
        sell_in_batch=payload.sell_in_batch,
        batch_size=payload.batch_size,
        additional_cost=payload.additional_cost,
        shopee=payload.shopee,
        production_cost=prices["production_cost"],
        sale_price=prices["sale_price"],
    )
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return variant


@router.get("/{product_id}/variants", response_model=List[schemas.ProductVariantResponse])
def list_variants(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return product.variants


@router.patch("/{product_id}/variants/{variant_id}", response_model=schemas.ProductVariantResponse)
def update_variant(product_id: int, variant_id: int, payload: schemas.ProductVariantUpdate, db: Session = Depends(get_db)):
    variant = db.query(models.ProductVariant).filter(
        models.ProductVariant.id == variant_id,
        models.ProductVariant.product_id == product_id,
    ).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variante não encontrada")

    if payload.name is not None:
        variant.name = payload.name
    if payload.filament_price_per_kg is not None:
        variant.filament_price_per_kg = payload.filament_price_per_kg
    if payload.spool_id is not None:
        variant.spool_id = payload.spool_id
    if payload.sell_in_batch is not None:
        variant.sell_in_batch = payload.sell_in_batch
    if payload.batch_size is not None:
        variant.batch_size = payload.batch_size
    if payload.additional_cost is not None:
        variant.additional_cost = payload.additional_cost
    if payload.shopee is not None:
        variant.shopee = payload.shopee

    recalc = any(x is not None for x in [
        payload.filament_price_per_kg, payload.production_cost,
        payload.sale_price, payload.batch_size, payload.additional_cost,
        payload.shopee,
    ])
    if recalc or not variant.production_cost or not variant.sale_price:
        product = db.query(models.Product).filter(models.Product.id == product_id).first()
        prices = _calc_variant_price(product, variant.filament_price_per_kg,
                                     variant.additional_cost, variant.batch_size,
                                     shopee=variant.shopee)
        if payload.production_cost is not None:
            variant.production_cost = payload.production_cost
        else:
            variant.production_cost = prices["production_cost"]
        if payload.sale_price is not None:
            variant.sale_price = payload.sale_price
        else:
            variant.sale_price = prices["sale_price"]

    db.commit()
    db.refresh(variant)
    return variant


@router.delete("/{product_id}/variants/{variant_id}")
def delete_variant(product_id: int, variant_id: int, db: Session = Depends(get_db)):
    variant = db.query(models.ProductVariant).filter(
        models.ProductVariant.id == variant_id,
        models.ProductVariant.product_id == product_id,
    ).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variante não encontrada")
    db.delete(variant)
    db.commit()
    return {"detail": "Variante removida"}
