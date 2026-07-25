"""Router de custos - calculadora de custo de impressão e auto-update em produtos."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models
from ..services.settings_file import load_settings

router = APIRouter(prefix="/costs", tags=["costs"])


ELECTRICITY_COST_PER_KWH = 0.95  # R$/kWh (padrão Brasil)
PRINTER_WATTS = 250  # watts médios de uma impressora 3D


class CostEstimate(BaseModel):
    filament_grams: float
    print_time_seconds: int
    filament_price_per_kg: float = 0.0
    electricity_rate: float = ELECTRICITY_COST_PER_KWH
    printer_watts: int = PRINTER_WATTS
    markup_percentage: float = 0.0
    taxes_fees: float = 0.0


class CostResult(BaseModel):
    filament_cost: float
    electricity_cost: float
    production_cost: float
    suggested_price: float
    taxes: float
    final_price: float


@router.post("/estimate", response_model=CostResult)
def estimate_cost(payload: CostEstimate):
    """Calcula custo estimado de impressão."""
    settings = load_settings()
    markup = payload.markup_percentage or settings.store.markup_percentage
    tax_rate = settings.store.tax_rate

    hours = payload.print_time_seconds / 3600
    filament_cost = (payload.filament_grams / 1000) * payload.filament_price_per_kg
    electricity_cost = (payload.printer_watts / 1000) * hours * payload.electricity_rate
    production_cost = filament_cost + electricity_cost

    base_price = production_cost * (1 + markup / 100)
    taxes = base_price * (tax_rate / 100) if tax_rate else 0
    final_price = base_price + taxes

    return CostResult(
        filament_cost=round(filament_cost, 2),
        electricity_cost=round(electricity_cost, 2),
        production_cost=round(production_cost, 2),
        suggested_price=round(base_price, 2),
        taxes=round(taxes, 2),
        final_price=round(final_price, 2),
    )


@router.post("/apply/{product_id}")
def apply_cost(product_id: int, payload: CostEstimate, db: Session = Depends(get_db)):
    """Calcula e aplica custo estimado a um produto."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    settings = load_settings()
    markup = payload.markup_percentage or settings.store.markup_percentage
    hours = payload.print_time_seconds / 3600
    filament_cost = (payload.filament_grams / 1000) * payload.filament_price_per_kg
    electricity_cost = (payload.printer_watts / 1000) * hours * payload.electricity_rate
    production_cost = round(filament_cost + electricity_cost, 2)
    suggested_price = round(production_cost * (1 + markup / 100), 2)

    product.filament_grams = payload.filament_grams
    product.print_time_seconds = payload.print_time_seconds
    product.production_cost = production_cost
    product.sale_price = suggested_price

    db.commit()
    db.refresh(product)

    from ..schemas import ProductResponse
    return {
        "product": ProductResponse.model_validate(product),
        "costs": {
            "filament_cost": round(filament_cost, 2),
            "electricity_cost": round(electricity_cost, 2),
            "production_cost": production_cost,
            "suggested_price": suggested_price,
        },
    }
