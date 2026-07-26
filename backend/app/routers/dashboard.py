"""Router do dashboard - estatísticas agregadas da loja e status Moonraker."""

from typing import Optional

import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from ..database import get_db, engine as db_engine
from .. import models
from ..schemas import Settings
from ..services.settings_file import load_settings

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

_is_pg = db_engine.url.get_backend_name() in ("postgresql",)

_moonraker_cache = {"data": None, "ts": 0.0}
_MR_CACHE_TTL = 10  # segundos


def _month_format(column):
    if _is_pg:
        return func.to_char(column, "YYYY-MM")
    return func.strftime("%Y-%m", column)


def _get_moonraker_url() -> str:
    try:
        settings = load_settings()
        return settings.moonraker.server
    except Exception:
        return "http://localhost:7125"


@router.get("/")
async def get_dashboard(db: Session = Depends(get_db)):
    total_products = db.query(func.count(models.Product.id)).scalar() or 0
    total_orders = db.query(func.count(models.Order.id)).scalar() or 0

    order_statuses = db.query(
        models.Order.status, func.count(models.Order.id)
    ).group_by(models.Order.status).all()
    orders_by_status = {s: c for s, c in order_statuses}

    total_stl_projects = db.query(func.count(models.StlProject.id)).scalar() or 0
    stl_projects_upload = db.query(func.count(models.StlProject.id)).filter(
        models.StlProject.source == "upload"
    ).scalar() or 0
    stl_projects_thingiverse = db.query(func.count(models.StlProject.id)).filter(
        models.StlProject.source == "thingiverse"
    ).scalar() or 0
    stl_info_pending = db.query(func.count(models.StlProject.id)).filter(
        models.StlProject.info_pending == True
    ).scalar() or 0

    total_stl_files = db.query(func.count(models.StlFile.id)).filter(
        models.StlFile.file_type == "stl"
    ).scalar() or 0
    total_gcode_files = db.query(func.count(models.StlFile.id)).filter(
        models.StlFile.file_type == "gcode"
    ).scalar() or 0
    unsliced_stl = db.query(func.count(models.StlFile.id)).filter(
        models.StlFile.file_type == "stl", models.StlFile.is_sliced == False
    ).scalar() or 0

    total_synced = db.query(func.count(models.ThingiverseSync.id)).filter(
        models.ThingiverseSync.status == "DOWNLOADED"
    ).scalar() or 0
    total_failed_sync = db.query(func.count(models.ThingiverseSync.id)).filter(
        models.ThingiverseSync.status == "FAILED"
    ).scalar() or 0
    total_collections = db.query(func.count(models.ThingiverseCollectionConfig.id)).scalar() or 0

    products_with_costs = db.query(func.count(models.Product.id)).filter(
        models.Product.production_cost.isnot(None)
    ).scalar() or 0
    products_with_price = db.query(func.count(models.Product.id)).filter(
        models.Product.sale_price.isnot(None)
    ).scalar() or 0

    moonraker_status = None
    moonraker_error = None
    import time
    now = time.time()
    if now - _moonraker_cache["ts"] < _MR_CACHE_TTL and _moonraker_cache["data"] is not None:
        cached = _moonraker_cache["data"]
        moonraker_status = cached["status"]
        moonraker_error = cached["error"]
    else:
        try:
            mr_url = _get_moonraker_url()
            async with httpx.AsyncClient(timeout=5.0) as client:
                info_resp = await client.get(f"{mr_url}/printer/info")
                if info_resp.is_success:
                    info_data = info_resp.json().get("result", {})
                    query_resp = await client.get(
                        f"{mr_url}/printer/objects/query?print_stats&heater_bed&gcode_move&extruder"
                    )
                    query_data = {}
                    if query_resp.is_success:
                        query_data = query_resp.json().get("result", {}).get("status", {})

                    print_stats = query_data.get("print_stats", {})
                    gcode_move = query_data.get("gcode_move", {})

                    moonraker_status = {
                        "state": info_data.get("state", "unknown"),
                        "hostname": info_data.get("hostname", ""),
                        "firmware_version": info_data.get("firmware_version", ""),
                        "print_stats": {
                            "state": print_stats.get("state", ""),
                            "filename": print_stats.get("filename", ""),
                            "total_duration": print_stats.get("total_duration", 0),
                            "print_duration": print_stats.get("print_duration", 0),
                            "filament_used": print_stats.get("filament_used", 0),
                            "progress": query_data.get("display_status", {}).get("progress", 0) if "display_status" in query_data else None,
                        },
                        "current_position": {
                            "x": gcode_move.get("gcode_position", [None, None, None, None])[0],
                            "y": gcode_move.get("gcode_position", [None, None, None, None])[1],
                            "z": gcode_move.get("gcode_position", [None, None, None, None])[2],
                        } if gcode_move.get("gcode_position") else None,
                        "extruder_temperature": query_data.get("extruder", {}).get("temperature", None) if "extruder" in query_data else None,
                        "heater_bed_temperature": query_data.get("heater_bed", {}).get("temperature", None) if "heater_bed" in query_data else None,
                    }
                else:
                    moonraker_error = f"Moonraker retornou status {info_resp.status_code}"
        except httpx.ConnectError:
            moonraker_error = "Não foi possível conectar ao Moonraker"
        except httpx.TimeoutException:
            moonraker_error = "Timeout ao conectar no Moonraker"
        except Exception as e:
            moonraker_error = str(e)
        _moonraker_cache["data"] = {"status": moonraker_status, "error": moonraker_error}
        _moonraker_cache["ts"] = now

    return {
        "products": {
            "total": total_products,
            "with_costs": products_with_costs,
            "with_price": products_with_price,
        },
        "orders": {
            "total": total_orders,
            "by_status": orders_by_status,
        },
        "stl_projects": {
            "total": total_stl_projects,
            "upload": stl_projects_upload,
            "thingiverse": stl_projects_thingiverse,
            "info_pending": stl_info_pending,
        },
        "stl_files": {
            "total_stl": total_stl_files,
            "total_gcode": total_gcode_files,
            "unsliced": unsliced_stl,
        },
        "thingiverse": {
            "synced": total_synced,
            "failed": total_failed_sync,
            "collections": total_collections,
        },
        "moonraker": moonraker_status,
        "moonraker_error": moonraker_error,
    }


@router.get("/charts")
async def get_charts(db: Session = Depends(get_db)):
    month_col = _month_format(models.Product.created_at)
    products_data = db.query(
        month_col.label('month'),
        func.count(models.Product.id).label('count'),
    ).group_by(month_col).order_by(month_col).all()
    products_by_month = [{"month": r.month, "count": r.count} for r in products_data]

    month_col_ord = _month_format(models.Order.created_at)
    orders_data = db.query(
        month_col_ord.label('month'),
        func.count(models.Order.id).label('count'),
    ).group_by(month_col_ord).order_by(month_col_ord).all()
    orders_by_month = [{"month": r.month, "count": r.count} for r in orders_data]

    month_col_proj = _month_format(models.StlProject.created_at)
    projects_data = db.query(
        month_col_proj.label('month'),
        func.count(models.StlProject.id).label('count'),
    ).group_by(month_col_proj).order_by(month_col_proj).all()
    projects_by_month = [{"month": r.month, "count": r.count} for r in projects_data]

    price_ranges = db.query(
        models.Product.sale_price,
    ).filter(models.Product.sale_price.isnot(None)).all()
    price_distribution = [
        {"range": "Até R$50", "count": sum(1 for p in price_ranges if p.sale_price <= 50)},
        {"range": "R$50-100", "count": sum(1 for p in price_ranges if 50 < p.sale_price <= 100)},
        {"range": "R$100-200", "count": sum(1 for p in price_ranges if 100 < p.sale_price <= 200)},
        {"range": "R$200+", "count": sum(1 for p in price_ranges if p.sale_price > 200)},
    ]

    total_filament = db.query(func.sum(models.Product.filament_grams)).scalar() or 0

    return {
        "products_by_month": products_by_month,
        "orders_by_month": orders_by_month,
        "projects_by_month": projects_by_month,
        "price_distribution": price_distribution,
        "total_filament_grams": total_filament,
    }
