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
