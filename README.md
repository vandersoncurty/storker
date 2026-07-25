# Storker - A 3D Print Store Manager

Sistema de gerenciamento para loja de impressão 3D com integração Klipper/Moonraker/Spoolman/Mainsail e sincronização automática de modelos do Thingiverse.

## Funcionalidades

- **Produtos** - Catálogo com imagens, título, descrição, custos e status de fatiamento
- **Pedidos** - Gerenciamento de pedidos Shopee com fluxo de status
- **Thingiverse** - Sincronização automática de collections: baixa STLs e imagens, cria produtos automaticamente
- **Configurações** - URLs de integrações, diretório de download, intervalo de sync
- **Dashboard** - Visão geral com stats

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | FastAPI, SQLAlchemy, SQLite (dev), httpx |
| Frontend | React 19, Vite 8, Axios |
| Lint | oxlint (frontend) |
| 3D Print | Klipper → Moonraker → Mainsail → Spoolman |

## Pré-requisitos

- Python 3.12+
- Node.js 18+
- (Opcional) Docker e Docker Compose

## Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse http://localhost:5173

### Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:80
- Backend API: http://localhost:8000

## API Docs

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Estrutura

```
arsenal-3d-store/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + OpenAPI metadata
│   │   ├── config.py        # Env vars + .env
│   │   ├── database.py      # SQLAlchemy
│   │   ├── models.py        # ORM models
│   │   ├── schemas.py       # Pydantic schemas
│   │   ├── routers/         # API routes
│   │   └── services/        # External API clients
│   └── tests/               # Testes pytest
├── frontend/
│   └── src/
│       ├── App.jsx          # Sidebar + routing
│       └── pages/           # Dashboard, Products, Thingiverse, Settings
├── data/
│   ├── thingiverse_models/  # STLs baixados
│   └── product_images/      # Imagens dos produtos
└── docker-compose.yml
```

## Thingiverse Sync

1. Crie uma API key em https://www.thingiverse.com/apps/create
2. Crie o arquivo `.env` na raiz do backend:
   ```
   THINGIVERSE_APP_TOKEN=sua_token_aqui
   ```
3. Acesse Configurações → Thingiverse ou aba Thingiverse
4. Adicione o ID da collection que deseja sincronizar
5. Clique em "Sincronizar Agora"

Os modelos são baixados em `data/thingiverse_models/` e os produtos são criados automaticamente no catálogo.

## Testes

```bash
cd backend
.venv/bin/pytest tests/ -v
```

## Licença

MIT
