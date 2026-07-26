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


class ProductVariantCreate(BaseModel):
    name: str
    filament_price_per_kg: float = 0.0
    filament_spool_id: Optional[int] = None
    spool_id: Optional[int] = None
    sell_in_batch: bool = False
    batch_size: int = 1
    additional_cost: float = 0.0
    shopee: bool = False


class ProductVariantUpdate(BaseModel):
    name: Optional[str] = None
    filament_price_per_kg: Optional[float] = None
    spool_id: Optional[int] = None
    sell_in_batch: Optional[bool] = None
    batch_size: Optional[int] = None
    additional_cost: Optional[float] = None
    shopee: Optional[bool] = None
    production_cost: Optional[float] = None
    sale_price: Optional[float] = None


class ProductVariantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    name: str
    filament_price_per_kg: float
    spool_id: Optional[int] = None
    sell_in_batch: bool = False
    batch_size: int = 1
    additional_cost: float = 0.0
    shopee: bool = False
    production_cost: Optional[float] = None
    sale_price: Optional[float] = None
    created_at: datetime


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
    variants: list[ProductVariantResponse] = []
    created_at: datetime
    updated_at: datetime


class OrderBase(BaseModel):
    order_number: Optional[str] = None
    shopee_order_id: Optional[str] = None
    product_id: Optional[int] = None
    variant_id: Optional[int] = None
    quantity: int = 1
    amount: Optional[float] = None
    buyer_name: Optional[str] = None
    buyer_contact: Optional[str] = None
    shipping_address: Optional[str] = None
    notes: Optional[str] = None


class OrderCreate(OrderBase):
    pass


class OrderUpdate(BaseModel):
    order_number: Optional[str] = None
    product_id: Optional[int] = None
    variant_id: Optional[int] = None
    quantity: Optional[int] = None
    amount: Optional[float] = None
    buyer_name: Optional[str] = None
    buyer_contact: Optional[str] = None
    shipping_address: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class OrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    product_id: int
    quantity: int
    unit_price: Optional[float] = None
    product: Optional[ProductResponse] = None


class OrderStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    label: str
    color: str
    sort_order: int


class OrderResponse(OrderBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    product: Optional[ProductResponse] = None
    items: list[OrderItemResponse] = []
    created_at: datetime


class FinanceEntryCreate(BaseModel):
    type: str  # "income" ou "expense"
    description: str
    amount: float
    category: str = "other"
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None


class FinanceEntryUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None


class FinanceEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    description: str
    amount: float
    category: str
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    created_at: datetime


class FinanceBalance(BaseModel):
    total_income: float
    total_expense: float
    balance: float
    entries_count: int


class SettingsFinance(BaseModel):
    categories_income: str = "Venda"
    categories_expense: str = "Filamento,Energia,Embalagem,Frete,Taxa,Outro"
    initial_balance: float = 0.0


class SettingsMoonraker(BaseModel):
    server: str = "http://localhost:7125"


class SettingsSpoolman(BaseModel):
    server: str = "http://localhost:7912"


class SettingsThingiverse(BaseModel):
    download_dir: str = "data/thingiverse_models"
    sync_interval: int = 0  # minutos, 0 = desligado
    app_token: str = ""  # vazio = usar THINGIVERSE_APP_TOKEN do .env


class SettingsStore(BaseModel):
    name: str = "Minha Loja 3D"
    currency: str = "BRL"
    tax_rate: float = 0.0
    markup_percentage: float = 30.0


class SettingsPrinters(BaseModel):
    default_server: str = "http://localhost:7125"


class SettingsCosts(BaseModel):
    kwh_rate: float = 0.95
    printer_watts: int = 250
    labor_cost_per_hour: float = 0.0
    fixed_cost_per_print: float = 0.0
    ecommerce_fee_percent: float = 0.0
    profit_margin_percent: float = 30.0
    shopee_commission_pct: float = 20.0
    shopee_fixed_fee: float = 3.0
    shopee_commission_cap: float = 100.0
    shopee_tax_pct: float = 0.0


class Settings(BaseModel):
    moonraker: SettingsMoonraker = SettingsMoonraker()
    spoolman: SettingsSpoolman = SettingsSpoolman()
    thingiverse: SettingsThingiverse = SettingsThingiverse()
    store: SettingsStore = SettingsStore()
    printers: SettingsPrinters = SettingsPrinters()
    costs: SettingsCosts = SettingsCosts()
    finance: SettingsFinance = SettingsFinance()


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
