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


@router.post("/entries", response_model=schemas.FinanceEntryResponse)
def create_entry(payload: schemas.FinanceEntryCreate, db: Session = Depends(get_db)):
    if payload.type not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="Tipo deve ser 'income' ou 'expense'")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Valor deve ser positivo")
    entry = models.FinanceEntry(**payload.model_dump())
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
        q = q.filter(models.FinanceEntry.type == type_filter)
    if category:
        q = q.filter(models.FinanceEntry.category == category)
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
    for field, value in payload.model_dump(exclude_unset=True).items():
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
    total_income = sum(e.amount for e in entries if e.type == "income")
    total_expense = sum(e.amount for e in entries if e.type == "expense")
    return schemas.FinanceBalance(
        total_income=total_income,
        total_expense=total_expense,
        balance=total_income - total_expense,
        entries_count=len(entries),
    )
