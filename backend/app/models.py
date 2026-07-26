from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, Enum
from sqlalchemy.orm import relationship
import enum

from .database import Base


class FileType(str, enum.Enum):
    STL = "stl"
    GCODE = "gcode"


class StlProject(Base):
    """Projeto de modelo STL (Thingiverse sync ou upload manual)."""
    __tablename__ = "stl_projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    path = Column(String)
    source = Column(String, default="upload")  # "thingiverse" ou "upload"
    info_pending = Column(Boolean, default=True)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    thing_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    files = relationship("StlFile", back_populates="project", cascade="all, delete-orphan")


class StlFile(Base):
    """Arquivo STL ou GCode dentro de um projeto."""
    __tablename__ = "stl_files"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("stl_projects.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_type = Column(String, default="stl")  # "stl" ou "gcode"
    is_sliced = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    project = relationship("StlProject", back_populates="files")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text, default="")
    thing_id = Column(Integer, unique=True, nullable=True, index=True)
    thing_url = Column(String, nullable=True)
    local_path = Column(String, nullable=True)
    is_sliced = Column(Boolean, default=False)
    filament_grams = Column(Float, nullable=True)
    print_time_seconds = Column(Integer, nullable=True)
    production_cost = Column(Float, nullable=True)
    sale_price = Column(Float, nullable=True)
    taxes_fees = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    order_items = relationship("OrderItem", back_populates="product")


class ProductVariant(Base):
    """Opção de filamento para um produto, com preço próprio."""
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    name = Column(String, nullable=False)
    filament_price_per_kg = Column(Float, default=0.0)
    spool_id = Column(Integer, nullable=True)
    sell_in_batch = Column(Boolean, default=False)
    batch_size = Column(Integer, default=1)
    additional_cost = Column(Float, default=0.0)
    shopee = Column(Boolean, default=False)
    production_cost = Column(Float, nullable=True)
    sale_price = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    product = relationship("Product", back_populates="variants")


class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    file_path = Column(String, nullable=False)
    original_url = Column(String, nullable=True)
    source = Column(String, default="upload")  # "thingiverse" ou "upload"
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    product = relationship("Product", back_populates="images")


class OrderItem(Base):
    """Item individual dentro de um pedido — vincula Order a Product."""
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, nullable=True)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, nullable=True, index=True)
    shopee_order_id = Column(String, nullable=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    variant_id = Column(Integer, ForeignKey("product_variants.id"), nullable=True)
    quantity = Column(Integer, default=1)
    status = Column(String, default="PENDING")  # PENDING, PRINTING, DONE, SHIPPED, CANCELED, REFUNDED
    amount = Column(Float, nullable=True)
    buyer_name = Column(String, nullable=True)
    buyer_contact = Column(String, nullable=True)
    shipping_address = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    product = relationship("Product")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class FinanceEntry(Base):
    __tablename__ = "finance_entries"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)  # "income" ou "expense"
    description = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String, default="other")  # sale, material, shipping, fee, other
    reference_type = Column(String, nullable=True)  # "order" ou "manual"
    reference_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))


class OrderStatus(Base):
    __tablename__ = "order_statuses"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False, index=True)
    label = Column(String, nullable=False)
    color = Column(String, nullable=False)
    sort_order = Column(Integer, default=0)


class ThingiverseCollectionConfig(Base):
    """Collections configuradas para sync automático."""
    __tablename__ = "thingiverse_collections"

    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, unique=True, index=True)
    name = Column(String)
    last_synced_at = Column(DateTime, nullable=True)


class ThingiverseSync(Base):
    """Registro de things baixados do Thingiverse."""
    __tablename__ = "thingiverse_sync"

    id = Column(Integer, primary_key=True, index=True)
    thing_id = Column(Integer, unique=True, index=True)
    thing_name = Column(String, nullable=False)
    thing_url = Column(String)
    local_path = Column(String)
    status = Column(String, default="DOWNLOADED")  # DOWNLOADED / FAILED
    synced_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
