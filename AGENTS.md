# AGENTS.md

Sistema de gerenciamento para loja de impressão 3D. Integração com stack Klipper/Moonraker/Spoolman/Mainsail.

## App

- **Nome**: Storker
- **Descrição**: Storker - A 3D print Store Manager
- **Swagger**: `/docs` (http://localhost:8000/docs)
- **Redoc**: `/redoc` (http://localhost:8000/redoc)

## Stack

- **Backend**: FastAPI + SQLAlchemy + PostgreSQL (prod) / SQLite (dev) / httpx para APIs externas
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
  models.py            # Models: Product, ProductImage, Order, Thingiverse*, StlProject, StlFile
  schemas.py           # Pydantic schemas (com ConfigDict)
  routers/
    products.py        # CRUD + imagens (upload, set primary, delete) + search/filter
    orders.py          # CRUD + status update
    dashboard.py       # Estatísticas agregadas + Moonraker status
    settings.py        # GET/PUT/PATCH settings (via settings_file.py)
    thingiverse.py     # Collections CRUD + sync trigger
    stl_projects.py    # Upload (STL/ZIP), GCode, download, delete
    printers.py        # Status Moonraker + controles (pause/cancel/resume)
    jobs.py            # Fila de impressão + envio GCode
    costs.py           # Calculadora de custo + auto-set em produtos
    filament.py        # Spoolman integration (spools, filaments)
  services/
    moonraker.py       # Client async Moonraker API (com fallback settings)
    spoolman.py        # Client async Spoolman API (com fallback settings)
    thingiverse.py     # Client async Thingiverse API (things, files, images)
    sync.py            # Sync logic: download STLs+imagens, cria Products + StlProjects
    settings_file.py   # Persistência INI (storker.conf)
    sync_scheduler.py  # Background task para sync automático

frontend/src/
  App.jsx              # Sidebar navigation + page routing
  main.jsx             # Entry point React
  pages/
    Dashboard.jsx      # Stats cards + Moonraker status
    Products.jsx       # Grid de cards + modal de edição + search/filter + cost calc
    StlFiles.jsx       # Arquivos STL (upload, thingiverse, list, edit, delete)
    FileExplorer.jsx   # File browser com right-click menu
    Printers.jsx       # Status/controle da impressora (Moonraker)
    Jobs.jsx           # Fila de impressão do Moonraker
    Filament.jsx       # Spools e filamentos (Spoolman)
    Settings.jsx       # Configurações por categoria + Thingiverse collections

data/
  thingiverse_models/  # STLs baixados do Thingiverse
  product_images/      # Imagens dos produtos
  uploaded_models/     # STLs de upload manual
  gcodes/              # GCode vinculados
  config/              # storker.conf (configurações em INI)
```

## Convenções

- **Idioma**: Comentários e variáveis em português no código do backend; componentes React em inglês
- **Ambiente**: Variáveis de configuração via `.env` (carregado por python-dotenv em config.py)
- **Database**: SQLite em dev (`store.db`); PostgreSQL em prod via `DB_*` env vars
- **Imagens**: Otimizadas automaticamente no upload (redimensionamento para 1920px, compressão JPEG 85%) via Pillow
- **Settings**: Configurações salvas em `backend/data/config/storker.conf` (INI via configparser)
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

## Módulos implementados (em ordem de criação)

- ✅ `printers` - Gerenciamento de impressoras e status Klipper (com progress bar, temperaturas, auto-refresh)
- ✅ `filament` - Spoolman integration, estoque de filamento (com vendor, preço, densidade, temperatura)
- ✅ `jobs` - Fila de impressão, histórico de jobs
- ✅ `costs` - Cálculo de custo por peça (filamento + tempo + energia + margem), GCode parser, auto-set em variantes
- ✅ `variants` - Variantes de produto com preço calculado automaticamente
- ✅ `dark-mode` - Toggle manual com persistência em localStorage e fallback para preferência do sistema
- ⬜ `shopee` - Integração com pedidos Shopee (webhook/polling) — pendente

## Gotchas

- Moonraker API é async (usar httpx AsyncClient)
- Spoolman API retorna peso em gramas
- `.env` nunca deve ser committado (contém THINGIVERSE_APP_TOKEN)
- O venv do backend usa Python 3.14 (Arch) - recriar com `python -m venv .venv` se quebrar
- `python-multipart` é obrigatório para upload de arquivos no FastAPI
- Docs da API disponíveis em `/docs` (Swagger) e `/redoc` (ReDoc)
