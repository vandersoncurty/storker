from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ProductImageBase(BaseModel):
    source: str = "upload"
    is_primary: bool = False


class ProductImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_path: str
    original_url: Optional[str] = None
    source: str
    is_primary: bool
    created_at: datetime


class ProductBase(BaseModel):
    title: str
    description: str = ""


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_sliced: Optional[bool] = None
    filament_grams: Optional[float] = None
    print_time_seconds: Optional[int] = None
    production_cost: Optional[float] = None
    sale_price: Optional[float] = None
    taxes_fees: Optional[float] = None


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    thing_id: Optional[int] = None
    thing_url: Optional[str] = None
    local_path: Optional[str] = None
    is_sliced: bool
    filament_grams: Optional[float] = None
    print_time_seconds: Optional[int] = None
    production_cost: Optional[float] = None
    sale_price: Optional[float] = None
    taxes_fees: Optional[float] = None
    images: list[ProductImageResponse] = []
    created_at: datetime
    updated_at: datetime


class OrderBase(BaseModel):
    shopee_order_id: str


class OrderCreate(OrderBase):
    pass


class OrderResponse(OrderBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    created_at: datetime


class SettingsMoonraker(BaseModel):
    server: str = "http://localhost:7125"


class SettingsSpoolman(BaseModel):
    server: str = "http://localhost:7912"


class SettingsThingiverse(BaseModel):
    download_dir: str = "data/thingiverse_models"
    sync_interval: int = 0  # minutos, 0 = desligado
    app_token: str = ""  # vazio = usar THINGIVERSE_APP_TOKEN do .env


class Settings(BaseModel):
    moonraker: SettingsMoonraker = SettingsMoonraker()
    spoolman: SettingsSpoolman = SettingsSpoolman()
    thingiverse: SettingsThingiverse = SettingsThingiverse()


class ThingiverseCollectionCreate(BaseModel):
    collection_id: int
    name: str = ""


class ThingiverseCollectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    collection_id: int
    name: str
    last_synced_at: Optional[datetime] = None


class ThingiverseSyncResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    thing_id: int
    thing_name: str
    thing_url: str
    local_path: str
    status: str
    synced_at: datetime


class SyncResult(BaseModel):
    collection_id: int
    downloaded: int
    skipped: int
    failed: int


class SyncResponse(BaseModel):
    results: list[SyncResult]
    total_downloaded: int
    total_skipped: int
    total_failed: int


class StlFileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    filename: str
    file_path: str
    file_type: str
    is_sliced: bool
    created_at: datetime


class StlProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    path: str
    source: str
    info_pending: bool
    title: Optional[str] = None
    description: Optional[str] = None
    thing_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    files: list[StlFileResponse] = []


class StlProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
