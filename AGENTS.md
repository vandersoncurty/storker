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
```

## Estrutura

```
backend/app/
  main.py          # FastAPI app + CORS + routers
  config.py        # Settings via env vars (MOONRAKER_URL, SPOOLMAN_URL, etc.)
  database.py      # SQLAlchemy engine + session
  models.py        # Models: Product, Order
  schemas.py       # Pydantic schemas
  routers/         # API routers (products, orders)
  services/        # Clients HTTP: moonraker.py, spoolman.py

frontend/src/
  App.jsx          # Componente principal (placeholder)
  main.jsx         # Entry point React
```

## Convenções

- **Idioma**: Comentários e variáveis em português no código do backend; componentes React em inglês
- **Ambiente**: Variáveis de configuração em `backend/app/config.py` via env vars
- **Database**: SQLite em dev (`store.db`); trocar `DATABASE_URL` para PostgreSQL em prod
- **Moonraker**: API REST em `http://localhost:7125` (configurável via `MOONRAKER_URL`)
- **Spoolman**: API REST em `http://localhost:7912` (configurável via `SPOOLMAN_URL`)
- **CORS**: Frontend assume porta 5173 (Vite default)

## Módulos previstos (criar separadamente)

- `printers` - Gerenciamento de impressoras e status Klipper
- `filament` - Spoolman integration, estoque de filamento
- `jobs` - Fila de impressão, histórico de jobs
- `costs` - Cálculo de custo por peça (filamento + tempo)
- `shopee` - Integração com pedidos Shopee (webhook/polling)

## Gotchas

- `primary_order` não existe em SQLAlchemy; usar apenas `primary_key=True`
- Moonraker API é async (usar httpx AsyncClient)
- Spoolman API retorna peso em gramas
- SQLite não suporta `check_same_thread=False` em produção - trocar para PostgreSQL
