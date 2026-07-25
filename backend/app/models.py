from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base


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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")


class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    file_path = Column(String, nullable=False)
    original_url = Column(String, nullable=True)
    source = Column(String, default="upload")  # "thingiverse" ou "upload"
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="images")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    shopee_order_id = Column(String, unique=True, index=True)
    status = Column(String, default="PENDING")  # PENDING, PRINTING, DONE, SHIPPED
    created_at = Column(DateTime, default=datetime.utcnow)


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
    synced_at = Column(DateTime, default=datetime.utcnow)
