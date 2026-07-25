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


class Settings(BaseModel):
    integrations: SettingsIntegrations = SettingsIntegrations()
