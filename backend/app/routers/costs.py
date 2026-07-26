import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas
from ..paths import abs_path
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


class ShopeeEstimate(BaseModel):
    production_cost: float
    profit_margin_percent: float = 30.0
    shopee_commission_pct: float = 20.0
    shopee_fixed_fee: float = 3.0
    shopee_commission_cap: float = 100.0
    shopee_tax_pct: float = 0.0


class ShopeeResult(BaseModel):
    sale_price: float
    shopee_fee: float
    taxes: float
    net_profit: float
    actual_margin_pct: float
    commission_pct: float
    fixed_fee: float
    commission_cap_applied: bool


class VariantEstimateRequest(BaseModel):
    filament_grams: float = 0
    print_time_seconds: int = 0
    filament_price_per_kg: float = 0.0
    taxes_fees: float = 0.0
    batch_size: int = 1
    additional_cost: float = 0.0
    shopee: bool = False


class VariantEstimateResponse(BaseModel):
    production_cost: float
    sale_price: float
    shopee_result: Optional[ShopeeResult] = None


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


def calculate_shopee_price(payload: ShopeeEstimate) -> ShopeeResult:
    total_pct = (payload.shopee_commission_pct + payload.shopee_tax_pct + payload.profit_margin_percent) / 100.0
    if total_pct >= 1.0:
        raise HTTPException(status_code=400, detail="Soma das taxas, impostos e margem não pode ser >= 100%")

    sale_price = (payload.production_cost + payload.shopee_fixed_fee) / (1 - total_pct)
    commission_cap_applied = False

    shopee_fee_calc = sale_price * (payload.shopee_commission_pct / 100.0)
    if shopee_fee_calc > payload.shopee_commission_cap:
        sale_price = (payload.production_cost + payload.shopee_fixed_fee + payload.shopee_commission_cap) / (1 - ((payload.shopee_tax_pct + payload.profit_margin_percent) / 100.0))
        shopee_fee = payload.shopee_commission_cap + payload.shopee_fixed_fee
        commission_cap_applied = True
    else:
        shopee_fee = shopee_fee_calc + payload.shopee_fixed_fee

    taxes = sale_price * (payload.shopee_tax_pct / 100.0)
    net_profit = sale_price - payload.production_cost - shopee_fee - taxes

    return ShopeeResult(
        sale_price=round(sale_price, 2),
        shopee_fee=round(shopee_fee, 2),
        taxes=round(taxes, 2),
        net_profit=round(net_profit, 2),
        actual_margin_pct=round((net_profit / sale_price) * 100, 2) if sale_price else 0,
        commission_pct=payload.shopee_commission_pct,
        fixed_fee=payload.shopee_fixed_fee,
        commission_cap_applied=commission_cap_applied,
    )


@router.post("/shopee-estimate", response_model=ShopeeResult)
def estimate_shopee(payload: ShopeeEstimate):
    return calculate_shopee_price(payload)


@router.post("/shopee-apply/{product_id}")
def apply_shopee_price(product_id: int, payload: ShopeeEstimate, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    result = calculate_shopee_price(payload)
    product.production_cost = round(payload.production_cost, 2)
    product.sale_price = result.sale_price
    db.commit()
    return {
        "detail": "Preço Shopee aplicado ao produto",
        "production_cost": product.production_cost,
        "sale_price": product.sale_price,
        "shopee_result": result.model_dump(),
    }


@router.post("/variant-estimate", response_model=VariantEstimateResponse)
def estimate_variant(payload: VariantEstimateRequest):
    settings = load_settings()
    costs = settings.costs
    base = estimate_cost(CostEstimate(
        filament_grams=payload.filament_grams,
        print_time_seconds=payload.print_time_seconds,
        filament_price_per_kg=payload.filament_price_per_kg,
        printer_watts=costs.printer_watts,
        kwh_rate=costs.kwh_rate,
        labor_cost_per_hour=costs.labor_cost_per_hour,
        fixed_cost_per_print=costs.fixed_cost_per_print,
        ecommerce_fee_percent=costs.ecommerce_fee_percent,
        profit_margin_percent=costs.profit_margin_percent,
        taxes_fees=payload.taxes_fees,
    ))
    batch_prod_cost = base.production_cost * payload.batch_size + payload.additional_cost

    if payload.shopee:
        shopee_payload = ShopeeEstimate(
            production_cost=batch_prod_cost,
            profit_margin_percent=costs.profit_margin_percent,
            shopee_commission_pct=costs.shopee_commission_pct,
            shopee_fixed_fee=costs.shopee_fixed_fee,
            shopee_commission_cap=costs.shopee_commission_cap,
            shopee_tax_pct=costs.shopee_tax_pct,
        )
        sr = calculate_shopee_price(shopee_payload)
        return VariantEstimateResponse(
            production_cost=round(batch_prod_cost, 2),
            sale_price=sr.sale_price,
            shopee_result=sr,
        )

    final_price = base.final_price * payload.batch_size + payload.additional_cost
    return VariantEstimateResponse(
        production_cost=round(batch_prod_cost, 2),
        sale_price=round(final_price, 2),
    )


@router.post("/apply/{product_id}")
def apply_cost(product_id: int, payload: CostEstimate, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    result = estimate_cost(payload)
    product.filament_grams = payload.filament_grams
    product.print_time_seconds = payload.print_time_seconds
    product.production_cost = round(result.production_cost, 2)
    product.sale_price = round(result.final_price, 2)
    product.taxes_fees = round(payload.taxes_fees, 2)
    db.commit()
    return {"detail": "Custo aplicado ao produto", "production_cost": product.production_cost, "sale_price": product.sale_price}


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
        r'print\s*time:\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?',
        r'total\s*print\s*time:\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?',
        r'build\s*time:\s*(\d+):(\d+):(\d+)',
        r'total\s*printing\s*time\s*=\s*(\d+)s',
    ]
    for pat in time_pats:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            if pat == r';TIME_ELAPSED:\s*(\d+)':
                matches = re.findall(pat, text, re.IGNORECASE)
                seconds = max(int(t) for t in matches)
            elif pat == r'build\s*time:\s*(\d+):(\d+):(\d+)':
                h = int(m.group(1))
                mn = int(m.group(2))
                s = int(m.group(3))
                seconds = h * 3600 + mn * 60 + s
            elif pat == r'total\s*printing\s*time\s*=\s*(\d+)s':
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

    with open(str(abs_path(gcode_file.file_path)), "r") as f:
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
