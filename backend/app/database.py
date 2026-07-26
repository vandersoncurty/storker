from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import DATABASE_URL, DATA_DIR

_is_sqlite = DATABASE_URL.startswith("sqlite")

if _is_sqlite:
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def _get_columns(engine, table_name: str) -> set:
    try:
        inspector = inspect(engine)
        cols = [c["name"] for c in inspector.get_columns(table_name)]
        return set(cols)
    except Exception:
        return set()


def _dialect_safe_add_column(engine, table_name: str, column):
    existing = _get_columns(engine, table_name)
    if column.name in existing:
        return
    col_type = column.type.compile(engine.dialect)
    nullable = "NULL" if column.nullable else "NOT NULL"
    default = ""
    if column.default is not None:
        default = f" DEFAULT {column.default.arg}"
    elif column.nullable:
        pass
    stmt = f"ALTER TABLE {table_name} ADD COLUMN {column.name} {col_type} {nullable}{default}"
    with engine.connect() as conn:
        conn.execute(text(stmt))
        conn.commit()


def check_and_migrate():
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    if not existing_tables:
        Base.metadata.create_all(bind=engine)
        return

    for table_name, table in Base.metadata.tables.items():
        if table_name not in existing_tables:
            Base.metadata.create_all(bind=engine, tables=[table])
            continue
        existing_cols = _get_columns(engine, table_name)
        for column in table.columns:
            if column.name not in existing_cols:
                if _is_sqlite:
                    col_type = column.type.compile(engine.dialect)
                    nullable = "NULL" if column.nullable else "NOT NULL"
                    default = ""
                    if column.default is not None:
                        default = f" DEFAULT {column.default.arg}"
                    stmt = f"ALTER TABLE {table_name} ADD COLUMN {column.name} {col_type} {nullable}{default}"
                    with engine.connect() as conn:
                        conn.execute(text(stmt))
                        conn.commit()
                else:
                    _dialect_safe_add_column(engine, table_name, column)

    _migrate_absolute_to_relative_paths()
    _migrate_order_status_fk()
    _migrate_finance_fk()
    _migrate_drop_old_not_null()
    _seed_all()


def _migrate_absolute_to_relative_paths():
    """Converte paths absolutos existentes no banco para relativos a DATA_DIR."""
    from sqlalchemy import MetaData, Table

    meta = MetaData()
    meta.reflect(bind=engine)
    path_columns = [
        ("stl_files", "file_path"),
        ("products", "local_path"),
        ("product_images", "file_path"),
        ("thingiverse_sync", "local_path"),
        ("stl_projects", "path"),
    ]
    for table_name, column_name in path_columns:
        if table_name not in meta.tables:
            continue
        tbl = meta.tables[table_name]
        if column_name not in tbl.c:
            continue
        col = tbl.c[column_name]
        stmt = tbl.select().where(col.isnot(None))
        with engine.connect() as conn:
            rows = conn.execute(stmt).fetchall()
        updated = 0
        for row in rows:
            raw = getattr(row, column_name)
            if not raw or not isinstance(raw, str):
                continue
            p = Path(raw)
            if p.is_absolute():
                try:
                    relative = str(p.relative_to(DATA_DIR))
                except ValueError:
                    continue
                with engine.connect() as conn:
                    conn.execute(
                        tbl.update().where(tbl.c.id == row.id).values({column_name: relative})
                    )
                    conn.commit()
                    updated += 1
        if updated:
            print(f"  Migrated {updated} rows in {table_name}.{column_name}")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


SEED_DATA = {
    "order_statuses": [
        {"code": "PENDING", "label": "Pendente", "color": "#f59e0b", "sort_order": 1},
        {"code": "PRINTING", "label": "Imprimindo", "color": "#3b82f6", "sort_order": 2},
        {"code": "DONE", "label": "Concluído", "color": "#22c55e", "sort_order": 3},
        {"code": "SHIPPED", "label": "Enviado", "color": "#6b7280", "sort_order": 4},
        {"code": "CANCELED", "label": "Cancelado", "color": "#ef4444", "sort_order": 5},
        {"code": "REFUNDED", "label": "Devolvido", "color": "#f97316", "sort_order": 6},
    ],
    "finance_types": [
        {"code": "income", "label": "Entrada", "color": "#22c55e", "sort_order": 1},
        {"code": "expense", "label": "Saída", "color": "#ef4444", "sort_order": 2},
    ],
    "finance_categories": [
        {"code": "sale", "label": "Venda", "color": "#22c55e", "sort_order": 1},
        {"code": "material", "label": "Filamento", "color": "#f59e0b", "sort_order": 2},
        {"code": "shipping", "label": "Frete", "color": "#3b82f6", "sort_order": 3},
        {"code": "fee", "label": "Taxa", "color": "#ef4444", "sort_order": 4},
        {"code": "energy", "label": "Energia", "color": "#f97316", "sort_order": 5},
        {"code": "other", "label": "Outro", "color": "#6b7280", "sort_order": 6},
    ],
    "file_types": [
        {"code": "stl", "label": "STL"},
        {"code": "gcode", "label": "GCode"},
    ],
    "source_types": [
        {"code": "upload", "label": "Upload"},
        {"code": "thingiverse", "label": "Thingiverse"},
    ],
    "sync_statuses": [
        {"code": "DOWNLOADED", "label": "OK", "color": "#22c55e"},
        {"code": "FAILED", "label": "Falha", "color": "#ef4444"},
    ],
}


def _drop_not_null(table: str, column: str):
    """Remove NOT NULL de uma coluna (PostgreSQL). SQLite ignora (dev only)."""
    if _is_sqlite:
        return
    from sqlalchemy import inspect as sa_inspect
    inspector = sa_inspect(engine)
    if table not in set(inspector.get_table_names()):
        return
    cols = inspector.get_columns(table)
    col_info = next((c for c in cols if c["name"] == column), None)
    if col_info is None or col_info.get("nullable", True):
        return
    with engine.connect() as conn:
        conn.execute(text(f'ALTER TABLE {table} ALTER COLUMN "{column}" DROP NOT NULL'))
        conn.commit()


def _migrate_drop_old_not_null():
    _drop_not_null("finance_entries", "type")
    _drop_not_null("finance_entries", "category")
    _drop_not_null("orders", "status")


def _seed_all(db=None):
    from . import models as m
    if db is None:
        db = SessionLocal()
        close = True
    else:
        close = False
    try:
        for table_name, rows in SEED_DATA.items():
            model = getattr(m, {
                "order_statuses": "OrderStatus",
                "finance_types": "FinanceType",
                "finance_categories": "FinanceCategory",
                "file_types": "FileType",
                "source_types": "SourceType",
                "sync_statuses": "SyncStatus",
            }[table_name])
            existing = {r.code for r in db.query(model).all()}
            for data in rows:
                if data["code"] not in existing:
                    db.add(model(**data))
        if db.new:
            db.commit()
    finally:
        if close:
            db.close()


def _code_to_id(db, table, code):
    from . import models as m
    model = getattr(m, {
        "order_statuses": "OrderStatus",
        "finance_types": "FinanceType",
        "finance_categories": "FinanceCategory",
    }[table])
    row = db.query(model).filter(model.code == code).first()
    return row.id if row else None


def _migrate_order_status_fk():
    from sqlalchemy import inspect as sa_inspect
    inspector = sa_inspect(engine)
    if "orders" not in set(inspector.get_table_names()):
        return
    cols = {c["name"] for c in inspector.get_columns("orders")}
    if "status_id" in cols:
        return
    from sqlalchemy import Column, Integer
    _dialect_safe_add_column(engine, "orders", Column("status_id", Integer, nullable=True))
    with SessionLocal() as db:
        _seed_all()
        from . import models as m
        rows = db.query(m.Order).filter(m.Order.status_id.is_(None), m.Order.status.isnot(None)).all()
        for order in rows:
            oid = _code_to_id(db, "order_statuses", order.status)
            if oid:
                order.status_id = oid
        if db.dirty:
            db.commit()
        for order in rows:
            if order.status_id is not None:
                order.status = None


def _migrate_finance_fk():
    from sqlalchemy import inspect as sa_inspect
    inspector = sa_inspect(engine)
    if "finance_entries" not in set(inspector.get_table_names()):
        return
    cols = {c["name"] for c in inspector.get_columns("finance_entries")}
    if "type_id" in cols:
        return
    from sqlalchemy import Column, Integer
    _dialect_safe_add_column(engine, "finance_entries", Column("type_id", Integer, nullable=True))
    _dialect_safe_add_column(engine, "finance_entries", Column("category_id", Integer, nullable=True))
    with SessionLocal() as db:
        _seed_all()
        from . import models as m
        rows = db.query(m.FinanceEntry).filter(m.FinanceEntry.type_id.is_(None)).all()
        for e in rows:
            e.type_id = _code_to_id(db, "finance_types", e.type)
            e.category_id = _code_to_id(db, "finance_categories", e.category)
        if db.dirty:
            db.commit()
        for e in rows:
            e.type = None
            e.category = None
