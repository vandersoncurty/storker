from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import CORS_ORIGINS, PRODUCT_IMAGES_DIR
from .database import check_and_migrate
from .routers import products, orders, settings, thingiverse, stl_projects, dashboard

check_and_migrate()

app = FastAPI(
    title="Storker",
    description=(
        "Storker - A 3D print Store Manager.\n\n"
        "Sistema de gerenciamento para loja de impressão 3D com integração "
        "Klipper/Moonraker/Spoolman/Mainsail e sincronização automática de modelos do Thingiverse."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {
            "name": "root",
            "description": "Health check e informações da API.",
        },
        {
            "name": "products",
            "description": (
                "Gerenciamento de produtos.\n\n"
                "Cada produto pode ter múltiplas imagens (uma principal), "
                "título, descrição, dados de custo e status de fatiamento."
            ),
        },
        {
            "name": "orders",
            "description": "Gerenciamento de pedidos (Shopee).",
        },
        {
            "name": "settings",
            "description": "Configurações do sistema (integrações, Thingiverse, etc).",
        },
        {
            "name": "thingiverse",
            "description": (
                "Sincronização com Thingiverse.\n\n"
                "Cadastre coleções, dispare sync manual ou configure sync automática. "
                "STLs e imagens são baixados eProducts são criados automaticamente."
            ),
        },
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PRODUCT_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/images/products", StaticFiles(directory=str(PRODUCT_IMAGES_DIR)), name="product_images")

app.include_router(products.router)
app.include_router(orders.router)
app.include_router(settings.router)
app.include_router(thingiverse.router)
app.include_router(stl_projects.router)
app.include_router(dashboard.router)


@app.get("/", tags=["root"])
def read_root():
    """Health check da API. Retorna status e versão."""
    return {"status": "API Operacional", "version": "0.1.0"}
