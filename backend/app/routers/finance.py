"""Router de finanças — controle de caixa, entradas e saídas."""

from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas


def _parse_date(d: str) -> datetime:
    return datetime.strptime(d, "%Y-%m-%d")


router = APIRouter(prefix="/finance", tags=["finance"])


def _resolve_type_id(db: Session, type_id: Optional[int] = None, type_code: Optional[str] = None):
    if type_id is not None:
        return type_id
    if type_code:
        t = db.query(models.FinanceType).filter(models.FinanceType.code == type_code).first()
        if t:
            return t.id
    return None


def _resolve_category_id(db: Session, category_id: Optional[int] = None, category_code: Optional[str] = None):
    if category_id is not None:
        return category_id
    if category_code:
        c = db.query(models.FinanceCategory).filter(models.FinanceCategory.code == category_code).first()
        if c:
            return c.id
    return None


@router.get("/types", response_model=List[schemas.FinanceTypeResponse])
def list_finance_types(db: Session = Depends(get_db)):
    """Lista tipos de lançamento financeiro (income/expense)."""
    return db.query(models.FinanceType).order_by(models.FinanceType.sort_order).all()


@router.get("/categories", response_model=List[schemas.FinanceCategoryResponse])
def list_finance_categories(db: Session = Depends(get_db)):
    """Lista categorias de lançamento financeiro."""
    return db.query(models.FinanceCategory).order_by(models.FinanceCategory.sort_order).all()


@router.post("/entries", response_model=schemas.FinanceEntryResponse)
def create_entry(payload: schemas.FinanceEntryCreate, db: Session = Depends(get_db)):
    if not payload.type and not payload.type_id:
        raise HTTPException(status_code=400, detail="type ou type_id é obrigatório")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Valor deve ser positivo")
    data = payload.model_dump(exclude={"type", "category"})
    data["type_id"] = _resolve_type_id(db, payload.type_id, payload.type)
    data["category_id"] = _resolve_category_id(db, payload.category_id, payload.category)
    if data["type_id"] is None:
        raise HTTPException(status_code=400, detail="Tipo inválido")
    entry = models.FinanceEntry(**data)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/entries", response_model=List[schemas.FinanceEntryResponse])
def list_entries(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    type_filter: str = Query(None, alias="type"),
    category: str = Query(None),
    days: int = Query(None, ge=1),
    start_date: str = Query(None, description="Data inicial (YYYY-MM-DD)"),
    end_date: str = Query(None, description="Data final (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    q = db.query(models.FinanceEntry)
    if type_filter:
        resolved = _resolve_type_id(db, type_code=type_filter)
        if resolved:
            q = q.filter(models.FinanceEntry.type_id == resolved)
    if category:
        resolved = _resolve_category_id(db, category_code=category)
        if resolved:
            q = q.filter(models.FinanceEntry.category_id == resolved)
    if days:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        q = q.filter(models.FinanceEntry.created_at >= cutoff)
    if start_date:
        q = q.filter(models.FinanceEntry.created_at >= _parse_date(start_date))
    if end_date:
        q = q.filter(models.FinanceEntry.created_at <= _parse_date(end_date).replace(hour=23, minute=59, second=59))
    return q.order_by(models.FinanceEntry.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/entries/{entry_id}", response_model=schemas.FinanceEntryResponse)
def get_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(models.FinanceEntry).filter(models.FinanceEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado")
    return entry


@router.patch("/entries/{entry_id}", response_model=schemas.FinanceEntryResponse)
def update_entry(entry_id: int, payload: schemas.FinanceEntryUpdate, db: Session = Depends(get_db)):
    entry = db.query(models.FinanceEntry).filter(models.FinanceEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado")
    data = {}
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "category" and value is not None:
            resolved = _resolve_category_id(db, category_code=value)
            if resolved:
                data["category_id"] = resolved
        elif field == "category_id" and value is not None:
            data["category_id"] = value
        else:
            data[field] = value
    for field, value in data.items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/entries/{entry_id}")
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(models.FinanceEntry).filter(models.FinanceEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado")
    db.delete(entry)
    db.commit()
    return {"detail": "Lançamento removido"}


@router.get("/balance", response_model=schemas.FinanceBalance)
def get_balance(
    days: int = Query(None, ge=1),
    start_date: str = Query(None, description="Data inicial (YYYY-MM-DD)"),
    end_date: str = Query(None, description="Data final (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    q = db.query(models.FinanceEntry)
    if days:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        q = q.filter(models.FinanceEntry.created_at >= cutoff)
    if start_date:
        q = q.filter(models.FinanceEntry.created_at >= _parse_date(start_date))
    if end_date:
        q = q.filter(models.FinanceEntry.created_at <= _parse_date(end_date).replace(hour=23, minute=59, second=59))
    entries = q.all()
    income_ids = {r.id for r in db.query(models.FinanceType.id).filter(models.FinanceType.code == "income").all()}
    total_income = sum(e.amount for e in entries if e.type_id in income_ids)
    total_expense = sum(e.amount for e in entries if e.type_id not in income_ids)
    return schemas.FinanceBalance(
        total_income=total_income,
        total_expense=total_expense,
        balance=total_income - total_expense,
        entries_count=len(entries),
    )
