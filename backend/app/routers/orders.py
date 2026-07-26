"""Router de pedidos - CRUD manual, gerenciamento de status e auto-finance."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload, subqueryload

from ..database import get_db
from .. import models, schemas
from ..paths import abs_path
from ..services.moonraker import upload_file_to_moonraker, start_print

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("/statuses", response_model=List[schemas.OrderStatusResponse])
def list_order_statuses(db: Session = Depends(get_db)):
    return db.query(models.OrderStatus).order_by(models.OrderStatus.sort_order).all()


def _resolve_status_id(db: Session, status_id: int = None, status_code: str = None):
    if status_id is not None:
        return status_id
    if status_code:
        s = db.query(models.OrderStatus).filter(models.OrderStatus.code == status_code).first()
        return s.id if s else None
    return None


def _code_from_status_id(db: Session, status_id: int):
    s = db.query(models.OrderStatus).filter(models.OrderStatus.id == status_id).first()
    return s.code if s else None


def _record_sale_finance(order: models.Order, db: Session):
    if order.amount and order.amount > 0:
        income_id = None
        sale_cat_id = None
        ft = db.query(models.FinanceType).filter(models.FinanceType.code == "income").first()
        if ft: income_id = ft.id
        fc = db.query(models.FinanceCategory).filter(models.FinanceCategory.code == "sale").first()
        if fc: sale_cat_id = fc.id

        existing = db.query(models.FinanceEntry).filter(
            models.FinanceEntry.reference_type == "order",
            models.FinanceEntry.reference_id == order.id,
        ).first()
        if not existing:
            entry = models.FinanceEntry(
                type_id=income_id,
                description=f"Venda #{order.id}",
                amount=order.amount,
                category_id=sale_cat_id,
                reference_type="order",
                reference_id=order.id,
            )
            db.add(entry)
            db.commit()


def _load_order(order_id: int, db: Session):
    return db.query(models.Order).options(
        joinedload(models.Order.items).joinedload(models.OrderItem.product).subqueryload(models.Product.images),
        joinedload(models.Order.items).joinedload(models.OrderItem.product).subqueryload(models.Product.variants),
        joinedload(models.Order.product).subqueryload(models.Product.images),
        joinedload(models.Order.product).subqueryload(models.Product.variants),
        joinedload(models.Order.status_ref),
    ).filter(models.Order.id == order_id).first()


@router.post("/", response_model=schemas.OrderResponse)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    data = payload.model_dump(exclude={"status", "status_id"})
    data["status_id"] = _resolve_status_id(db, payload.status_id, payload.status)
    if data["status_id"] is None:
        pending = db.query(models.OrderStatus).filter(models.OrderStatus.code == "PENDING").first()
        if pending:
            data["status_id"] = pending.id
    db_order = models.Order(**data)
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return _load_order(db_order.id, db)


@router.get("/", response_model=List[schemas.OrderResponse])
def list_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: str = Query(None, description="Filtrar por status (code)"),
    search: str = Query(None, description="Busca por nome do comprador"),
    db: Session = Depends(get_db),
):
    q = db.query(models.Order).options(
        joinedload(models.Order.items).joinedload(models.OrderItem.product).subqueryload(models.Product.images),
        joinedload(models.Order.items).joinedload(models.OrderItem.product).subqueryload(models.Product.variants),
        joinedload(models.Order.product).subqueryload(models.Product.images),
        joinedload(models.Order.product).subqueryload(models.Product.variants),
        joinedload(models.Order.status_ref),
    )
    if status:
        sid = _resolve_status_id(db, status_code=status)
        if sid:
            q = q.filter(models.Order.status_id == sid)
    if search:
        q = q.filter(models.Order.buyer_name.ilike(f"%{search}%"))
    return q.order_by(models.Order.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{order_id}", response_model=schemas.OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = _load_order(order_id, db)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return order


@router.patch("/{order_id}", response_model=schemas.OrderResponse)
def update_order(order_id: int, payload: schemas.OrderUpdate, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    data = payload.model_dump(exclude_unset=True)
    if "status" in data or "status_id" in data:
        data.pop("status", None)
        data["status_id"] = _resolve_status_id(db, payload.status_id, payload.status)
    for field, value in data.items():
        setattr(order, field, value)
    done_id = _resolve_status_id(db, status_code="DONE")
    if order.status_id == done_id:
        _record_sale_finance(order, db)
    db.commit()
    return _load_order(order_id, db)


@router.patch("/{order_id}/status", response_model=schemas.OrderResponse)
def update_order_status(order_id: int, status: str, db: Session = Depends(get_db)):
    valid = {r.code for r in db.query(models.OrderStatus.code).all()}
    if not valid:
        raise HTTPException(status_code=500, detail="Nenhum status cadastrado")
    if status not in valid:
        raise HTTPException(status_code=400, detail=f"Status inválido. Use: {valid}")
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    sid = _resolve_status_id(db, status_code=status)
    if sid:
        order.status_id = sid
    done_id = _resolve_status_id(db, status_code="DONE")
    if order.status_id == done_id:
        _record_sale_finance(order, db)
    db.commit()
    return _load_order(order_id, db)


@router.delete("/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    order_ref_id = _resolve_status_id(db, status_code="order")
    db.query(models.FinanceEntry).filter(
        models.FinanceEntry.reference_type == "order",
        models.FinanceEntry.reference_id == order_id,
    ).delete()
    db.delete(order)
    db.commit()
    return {"detail": "Pedido removido"}


@router.post("/{order_id}/send-to-printer")
async def send_order_to_printer(order_id: int, db: Session = Depends(get_db)):
    """Envia o(s) GCode(s) do produto do pedido para o Moonraker."""
    order = db.query(models.Order).options(
        joinedload(models.Order.product),
    ).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    if not order.product:
        raise HTTPException(status_code=400, detail="Pedido não possui produto vinculado")

    thing_id = order.product.thing_id
    local_path = order.product.local_path
    projects = []
    if thing_id:
        projects = db.query(models.StlProject).filter(
            models.StlProject.thing_id == thing_id
        ).all()
    if not projects and local_path:
        stl_name = local_path.rstrip("/").split("/")[-1]
        projects = db.query(models.StlProject).filter(
            models.StlProject.path.like(f"%{stl_name}%"),
        ).all()
    if not projects:
        raise HTTPException(status_code=400, detail="Nenhum projeto STL encontrado para este produto")

    sent = []
    errors = []
    for project in projects:
        gcode_files = [f for f in project.files if f.file_type == "gcode"]
        if not gcode_files:
            continue
        for gf in gcode_files:
            gcode_path = abs_path(gf.file_path)
            if not gcode_path.exists():
                errors.append(f"Arquivo não encontrado: {gf.filename}")
                continue
            try:
                await upload_file_to_moonraker(gf.filename, str(gcode_path))
                sent.append(gf.filename)
            except Exception as e:
                errors.append(f"{gf.filename}: {e}")

    detail = []
    if sent:
        detail.append(f"Enviado(s): {', '.join(sent)}")
    if errors:
        detail.append(f"Erro(s): {'; '.join(errors)}")
    if not sent and not errors:
        raise HTTPException(status_code=400, detail="Nenhum GCode encontrado nos projetos vinculados")

    return {"detail": ". ".join(detail), "sent": sent, "errors": errors}
