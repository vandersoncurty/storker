from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS
from .database import Base, engine
from .routers import products, orders, settings

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Arsenal 3D Store API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(orders.router)
app.include_router(settings.router)


@app.get("/")
def read_root():
    return {"status": "API Operacional", "version": "0.1.0"}
