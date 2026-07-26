import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas
from ..services.settings_file import load_settings
from ..services.spoolman import list_spools

router = APIRouter(prefix="/costs", tags=["costs"])


class CostEstimate(BaseModel):
    filament_grams: float = 0
    print_time_seconds: int = 0
    filament_price_per_kg: float = 0.0
    printer_watts: int = 250
    kwh_rate: float = 0.95
    labor_cost_per_hour: float = 0.0
    labor_hours: float = 0.0
    fixed_cost_per_print: float = 0.0
    ecommerce_fee_percent: float = 0.0
    profit_margin_percent: float = 30.0
    taxes_fees: float = 0.0


class CostResult(BaseModel):
    filament_cost: float
    electricity_cost: float
    labor_cost: float
    fixed_cost: float
    production_cost: float
    taxes_fees: float
    ecommerce_fee: float
    profit_amount: float
    final_price: float


@router.post("/estimate", response_model=CostResult)
def estimate_cost(payload: CostEstimate):
    hours = payload.print_time_seconds / 3600
    labor_hours = payload.labor_hours if payload.labor_hours > 0 else hours

    filament_cost = (payload.filament_grams / 1000) * payload.filament_price_per_kg
    electricity_cost = (payload.printer_watts / 1000) * hours * payload.kwh_rate
    labor_cost = payload.labor_cost_per_hour * labor_hours
    fixed_cost = payload.fixed_cost_per_print

    production_cost = filament_cost + electricity_cost + labor_cost + fixed_cost

    margin_mult = 1 + (payload.profit_margin_percent / 100)
    ecommerce_mult = 1 + (payload.ecommerce_fee_percent / 100)

    base_with_margin = production_cost * margin_mult
    final_price = base_with_margin * ecommerce_mult

    ecommerce_fee = final_price - base_with_margin
    profit_amount = base_with_margin - production_cost

    final_price = final_price + payload.taxes_fees

    return CostResult(
        filament_cost=round(filament_cost, 2),
        electricity_cost=round(electricity_cost, 2),
        labor_cost=round(labor_cost, 2),
        fixed_cost=round(fixed_cost, 2),
        production_cost=round(production_cost, 2),
        taxes_fees=round(payload.taxes_fees, 2),
        ecommerce_fee=round(ecommerce_fee, 2),
        profit_amount=round(profit_amount, 2),
        final_price=round(final_price, 2),
    )


@router.get("/settings", response_model=schemas.SettingsCosts)
def get_cost_settings():
    return load_settings().costs


def parse_gcode_text(text: str) -> dict:
    grams = 0.0
    seconds = 0

    patterns_grams = [
        r'filament\s*used\s*\[g\]\s*=\s*([\d.]+)',
        r'total\s*filament\s*used\s*\[g\]\s*=\s*([\d.]+)',
        r'filament\s*used:\s*([\d.]+)\s*g',
        r'filament\s*used\s*=\s*([\d.]+)\s*g',
    ]
    for pat in patterns_grams:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            grams = float(m.group(1))
            break

    if grams == 0:
        meters_pats = [
            r'filament\s*used\s*\[m\]\s*=\s*([\d.]+)',
            r'total\s*filament\s*used\s*\[m\]\s*=\s*([\d.]+)',
            r'filament\s*used:\s*([\d.]+)\s*m',
        ]
        for pat in meters_pats:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                grams = float(m.group(1)) * 2.89
                break

    time_pats = [
        r'estimated\s*printing\s*time.*?=\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?',
        r'print\s*time.*?=\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?',
        r'time\s*left.*?=\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?',
        r';TIME_ELAPSED:\s*(\d+)',
    ]
    for pat in time_pats:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            if pat == r';TIME_ELAPSED:\s*(\d+)':
                seconds = int(m.group(1))
            else:
                h = int(m.group(1)) if m.group(1) else 0
                mn = int(m.group(2)) if m.group(2) else 0
                s = int(m.group(3)) if m.group(3) else 0
                seconds = h * 3600 + mn * 60 + s
            break

    return {"filament_grams": round(grams, 1), "print_time_seconds": seconds}


@router.post("/parse-gcode")
async def parse_gcode(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".gcode"):
        raise HTTPException(status_code=400, detail="Apenas arquivos .gcode")
    content = await file.read()
    text = content.decode("utf-8", errors="replace")
    result = parse_gcode_text(text)

    spools = []
    try:
        spools = await list_spools()
    except Exception:
        pass

    settings = load_settings()

    return {
        "parsed": result,
        "settings": {
            "kwh_rate": settings.costs.kwh_rate,
            "printer_watts": settings.costs.printer_watts,
            "labor_cost_per_hour": settings.costs.labor_cost_per_hour,
            "fixed_cost_per_print": settings.costs.fixed_cost_per_print,
            "ecommerce_fee_percent": settings.costs.ecommerce_fee_percent,
            "profit_margin_percent": settings.costs.profit_margin_percent,
        },
        "spools": spools,
    }


@router.post("/auto/{project_id}")
async def auto_calculate(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.StlProject).filter(models.StlProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    gcode_file = next((f for f in project.files if f.file_type == "gcode"), None)
    if not gcode_file:
        raise HTTPException(status_code=400, detail="Projeto não possui GCode vinculado")

    with open(gcode_file.file_path, "r") as f:
        text = f.read()

    parsed = parse_gcode_text(text)
    settings = load_settings()
    costs = settings.costs

    product = db.query(models.Product).filter(
        models.Product.title == (project.title or project.name)
    ).first()

    if product:
        best_price = 0
        try:
            spools = await list_spools()
            for spool in spools:
                f = spool.get("filament", {})
                p = f.get("price") or spool.get("price") or 0
                if p > best_price:
                    best_price = p
        except Exception:
            pass

        payload = CostEstimate(
            filament_grams=parsed["filament_grams"],
            print_time_seconds=parsed["print_time_seconds"],
            filament_price_per_kg=best_price,
            printer_watts=costs.printer_watts,
            kwh_rate=costs.kwh_rate,
            labor_cost_per_hour=costs.labor_cost_per_hour,
            fixed_cost_per_print=costs.fixed_cost_per_print,
            ecommerce_fee_percent=costs.ecommerce_fee_percent,
            profit_margin_percent=costs.profit_margin_percent,
        )
        result = estimate_cost(payload)

        product.filament_grams = parsed["filament_grams"]
        product.print_time_seconds = parsed["print_time_seconds"]
        product.production_cost = result.production_cost
        product.sale_price = result.final_price
        db.commit()

        return {
            "product_id": product.id,
            "parsed": parsed,
            "costs": result.model_dump(),
        }

    return {"parsed": parsed, "product": None, "costs": None}
