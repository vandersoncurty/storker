from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from .database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    gcode_filename = Column(String)  # Nome do arquivo salvo no Moonraker/Mainsail
    filament_grams = Column(Float)   # Peso em gramas pra cálculo de custo
    print_time_seconds = Column(Integer)  # Tempo est. em segundos
    sale_price = Column(Float)       # Preço na Shopee

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