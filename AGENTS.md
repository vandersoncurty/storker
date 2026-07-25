# AGENTS.md

Sistema de gerenciamento para loja de impressão 3D. Integração com stack Klipper/Moonraker/Spoolman/Mainsail.

## App

- **Nome**: Storker
- **Descrição**: Storker - A 3D print Store Manager
- **Swagger**: `/docs` (http://localhost:8000/docs)
- **Redoc**: `/redoc` (http://localhost:8000/redoc)

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
  main.py              # FastAPI app + CORS + routers + OpenAPI metadata
  config.py            # Settings via env vars + .env (python-dotenv)
  database.py          # SQLAlchemy engine + session
  models.py            # Models: Product, ProductImage, Order, Thingiverse*
  schemas.py           # Pydantic schemas (com ConfigDict)
  routers/
    products.py        # CRUD + imagens (upload, set primary, delete)
    orders.py          # CRUD + status update
    settings.py        # GET/PUT/PATCH settings (via settings_file.py)
    thingiverse.py     # Collections CRUD + sync trigger
  services/
    moonraker.py       # Client async Moonraker API
    spoolman.py        # Client async Spoolman API
    thingiverse.py     # Client async Thingiverse API (things, files, images)
    sync.py            # Sync logic: download STLs+imagens, cria Products

frontend/src/
  App.jsx              # Sidebar navigation + page routing
  main.jsx             # Entry point React
  pages/
    Dashboard.jsx      # Stats cards
    Products.jsx       # Grid de cards + modal de edição
    Thingiverse.jsx    # Gerenciar collections + sync
    Settings.jsx       # Configurações por categoria

data/
  thingiverse_models/  # STLs baixados do Thingiverse
  product_images/      # Imagens dos produtos
```

## Convenções

- **Idioma**: Comentários e variáveis em português no código do backend; componentes React em inglês
- **Ambiente**: Variáveis de configuração via `.env` (carregado por python-dotenv em config.py)
- **Database**: SQLite em dev (`store.db`); trocar `DATABASE_URL` para PostgreSQL em prod
- **Settings**: Configurações salvas em `backend/settings.json` (gitignored)
- **CORS**: Frontend assume porta 5173 (Vite default)

## Commits

Formato obrigatório: `tipo: descrição curta em inglês`

Tipos aceitos:
- `feat:` nova funcionalidade
- `fix:` correção de bug
- `refactor:` reestruturação sem mudar comportamento
- `test:` adiciona ou corrige testes
- `docs:` documentação
- `chore:` tarefas de manutenção (deps, CI, config)

Exemplos:
```
feat: products with images, Thingiverse sync imports models
fix: settings page infinite loading
refactor: extract settings_file module
test: add product image upload tests
```

## Integrações

- **Moonraker**: API REST em `http://localhost:7125` (MOONRAKER_URL)
- **Spoolman**: API REST em `http://localhost:7912` (SPOOLMAN_URL)
- **Thingiverse**: Bearer token via THINGIVERSE_APP_TOKEN no `.env`

## Thingiverse Sync

- Crie API key em https://www.thingiverse.com/apps/create
- Cadastre collections pelo frontend (Configurações → Thingiverse ou aba Thingiverse)
- Sync manual (botão) ou automático (intervalo em minutos)
- STLs salvos em `data/thingiverse_models/`
- Imagens salvas em `data/product_images/`
- Products criados automaticamente com título/descrição do Thingiverse
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
- `python-multipart` é obrigatório para upload de arquivos no FastAPI
- Docs da API disponíveis em `/docs` (Swagger) e `/redoc` (ReDoc)
