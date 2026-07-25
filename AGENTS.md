# AGENTS.md

Sistema de gerenciamento para loja de impressão 3D. Integração com stack Klipper/Moonraker/Spoolman/Mainsail.

## Stack

- **Backend**: FastAPI + SQLAlchemy + SQLite (dev) / httpx para APIs externas
- **Frontend**: React 19 + Vite 8 + Axios
- **Lint frontend**: oxlint (não ESLint)
- **Print stack**: Klipper → Moonraker → Mainsail (UI) → Spoolman (filamentos)

## Comandos

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev      # Vite dev server (porta 5173)
npm run build    # Build de produção
npm run lint     # oxlint (não eslint)

# Docker
docker compose up --build          # Build e roda tudo
docker compose up -d               # Roda em background
docker compose down                # Para tudo
docker compose logs -f backend     # Logs do backend

# Testes
cd backend && .venv/bin/pytest tests/ -v
```

## Estrutura

```
backend/app/
  main.py          # FastAPI app + CORS + routers
  config.py        # Settings via env vars + .env (python-dotenv)
  database.py      # SQLAlchemy engine + session
  models.py        # Models: Product, Order, ThingiverseCollectionConfig, ThingiverseSync
  schemas.py       # Pydantic schemas
  routers/         # API routers (products, orders, settings, thingiverse)
  services/        # Clients HTTP: moonraker.py, spoolman.py, thingiverse.py, sync.py

frontend/src/
  App.jsx          # Sidebar navigation + page routing
  main.jsx         # Entry point React
  pages/           # Dashboard, Thingiverse, Settings, ...
```

## Convenções

- **Idioma**: Comentários e variáveis em português no código do backend; componentes React em inglês
- **Ambiente**: Variáveis de configuração via `.env` (carregado por python-dotenv em config.py)
- **Database**: SQLite em dev (`store.db`); trocar `DATABASE_URL` para PostgreSQL em prod
- **Settings**: Configurações salvas em `backend/settings.json` (gitignored)
- **CORS**: Frontend assume porta 5173 (Vite default)

## Integrações

- **Moonraker**: API REST em `http://localhost:7125` (MOONRAKER_URL)
- **Spoolman**: API REST em `http://localhost:7912` (SPOOLMAN_URL)
- **Thingiverse**: Bearer token via THINGIVERSE_APP_TOKEN no `.env`

## Thingiverse Sync

- Crie API key em https://www.thingiverse.com/apps/create
- Cadastre collections pelo frontend (Configurações → Thingiverse ou aba Thingiverse)
- Sync manual (botão) ou automático (intervalo em minutos)
- STLs salvos no diretório configurado (default: `./models/`)
- A API key fica em `.env` (não committar)

## Testes

```bash
cd backend
.venv/bin/pytest tests/ -v          # Todos
.venv/bin/pytest tests/test_products.py -v  # Só products
```

## Módulos previstos (criar separadamente)

- `printers` - Gerenciamento de impressoras e status Klipper
- `filament` - Spoolman integration, estoque de filamento
- `jobs` - Fila de impressão, histórico de jobs
- `costs` - Cálculo de custo por peça (filamento + tempo)
- `shopee` - Integração com pedidos Shopee (webhook/polling)

## Gotchas

- Moonraker API é async (usar httpx AsyncClient)
- Spoolman API retorna peso em gramas
- SQLite não suporta `check_same_thread=False` em produção - trocar para PostgreSQL
- `.env` nunca deve ser committado (contém THINGIVERSE_APP_TOKEN)
- O venv do backend usa Python 3.14 (Arch) - recriar com `python -m venv .venv` se quebrar
