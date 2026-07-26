"""Router de pedidos - CRUD manual, gerenciamento de status e auto-finance."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload, subqueryload

from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("/statuses", response_model=List[schemas.OrderStatusResponse])
def list_order_statuses(db: Session = Depends(get_db)):
    """Lista todos os status de pedido disponíveis."""
    return db.query(models.OrderStatus).order_by(models.OrderStatus.sort_order).all()


def _record_sale_finance(order: models.Order, db: Session):
    if order.amount and order.amount > 0:
        existing = db.query(models.FinanceEntry).filter(
            models.FinanceEntry.reference_type == "order",
            models.FinanceEntry.reference_id == order.id,
        ).first()
        if not existing:
            entry = models.FinanceEntry(
                type="income",
                description=f"Venda #{order.id}",
                amount=order.amount,
                category="sale",
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
    ).filter(models.Order.id == order_id).first()


@router.post("/", response_model=schemas.OrderResponse)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    """Cria um novo pedido manual."""
    db_order = models.Order(**payload.model_dump())
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return _load_order(db_order.id, db)


@router.get("/", response_model=List[schemas.OrderResponse])
def list_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: str = Query(None, description="Filtrar por status"),
    search: str = Query(None, description="Busca por nome do comprador"),
    db: Session = Depends(get_db),
):
    """Lista pedidos com filtros opcionais."""
    q = db.query(models.Order).options(
        joinedload(models.Order.items).joinedload(models.OrderItem.product).subqueryload(models.Product.images),
        joinedload(models.Order.items).joinedload(models.OrderItem.product).subqueryload(models.Product.variants),
        joinedload(models.Order.product).subqueryload(models.Product.images),
        joinedload(models.Order.product).subqueryload(models.Product.variants),
    )
    if status:
        q = q.filter(models.Order.status == status)
    if search:
        q = q.filter(models.Order.buyer_name.ilike(f"%{search}%"))
    return q.order_by(models.Order.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{order_id}", response_model=schemas.OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    """Busca um pedido por ID."""
    order = _load_order(order_id, db)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return order


@router.patch("/{order_id}", response_model=schemas.OrderResponse)
def update_order(order_id: int, payload: schemas.OrderUpdate, db: Session = Depends(get_db)):
    """Atualiza dados de um pedido (incluindo status)."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(order, field, value)
    if order.status == "DONE":
        _record_sale_finance(order, db)
    db.commit()
    return _load_order(order_id, db)


@router.patch("/{order_id}/status", response_model=schemas.OrderResponse)
def update_order_status(order_id: int, status: str, db: Session = Depends(get_db)):
    """Atualiza apenas o status. Valores vindos da tabela order_statuses."""
    db_codes = {r.code for r in db.query(models.OrderStatus.code).all()}
    valid = db_codes if db_codes else {"PENDING", "PRINTING", "DONE", "SHIPPED", "CANCELED", "REFUNDED"}
    if status not in valid:
        raise HTTPException(status_code=400, detail=f"Status inválido. Use: {valid}")
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    order.status = status
    if status == "DONE":
        _record_sale_finance(order, db)
    db.commit()
    return _load_order(order_id, db)


@router.delete("/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db)):
    """Remove um pedido e suas entradas financeiras."""
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    db.query(models.FinanceEntry).filter(
        models.FinanceEntry.reference_type == "order",
        models.FinanceEntry.reference_id == order_id,
    ).delete()
    db.delete(order)
    db.commit()
    return {"detail": "Pedido removido"}
