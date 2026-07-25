from datetime import datetime

from pydantic import BaseModel


class ProductBase(BaseModel):
    name: str
    gcode_filename: str
    filament_grams: float
    print_time_seconds: int
    sale_price: float


class ProductCreate(ProductBase):
    pass


class ProductResponse(ProductBase):
    id: int
    class Config:
        from_attributes = True


class OrderBase(BaseModel):
    shopee_order_id: str


class OrderCreate(OrderBase):
    pass


class OrderResponse(OrderBase):
    id: int
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


class SettingsIntegrations(BaseModel):
    moonraker_url: str = "http://localhost:7125"
    spoolman_url: str = "http://localhost:7912"
    thingiverse_download_dir: str = "./models"
    thingiverse_sync_interval: int = 0  # minutos, 0 = desligado


class Settings(BaseModel):
    integrations: SettingsIntegrations = SettingsIntegrations()


class ThingiverseCollectionCreate(BaseModel):
    collection_id: int
    name: str = ""


class ThingiverseCollectionResponse(BaseModel):
    id: int
    collection_id: int
    name: str
    last_synced_at: datetime | None = None
    class Config:
        from_attributes = True


class ThingiverseSyncResponse(BaseModel):
    id: int
    thing_id: int
    thing_name: str
    thing_url: str
    local_path: str
    status: str
    synced_at: datetime
    class Config:
        from_attributes = True


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
