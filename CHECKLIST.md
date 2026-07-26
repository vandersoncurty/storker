# Checklist de Funcionalidades

## ✅ Concluídas

### Módulos grandes
- **`printers`** — router + página Impressoras + status/controle Moonraker + progress bar + temperaturas + auto-refresh 3s
- **`filament`** — router + página Filamento + conexão Spoolman (spools, filament types, vendor, price, density)
- **`jobs`** — router + página com fila de impressão do Moonraker + enviar para fila
- **`costs`** — calculadora de custo + GCode parser + settings persistidos + auto-set em variantes
- **`variants`** — variantes de produto CRUD com preço automático (filamento + energia + mão de obra + margem)
- **`dark-mode`** — toggle manual com localStorage + preferência do sistema como fallback
- **`finance`** — controle de caixa (entradas/saídas, saldo, filtros por período, auto-registro de vendas)

### Impressoras e Jobs
- Controles da impressora — pause/resume/cancel + progress bar + temperaturas + auto-refresh 3s
- Enviar GCode para impressora — botão "enviar para fila" e "imprimir agora" no StlFiles
- "Enviar para fila" — funcional com upload para Moonraker + opção de iniciar impressão
- **Jobs "Remover"** — opção escondida se projeto não tem GCode

### STL e Arquivos
- Upload de ZIP (extraído no backend)
- Criação automática de Product ao definir título do projeto
- Excluir produtos / projetos STL / imagens pelo frontend
- Busca e filtro de produtos (search + is_sliced)
- Visualizar arquivos dentro do projeto STL — modal "Editar" lista STLs e GCode
- Download individual de STL/GCode do StlFiles (ícones de download)
- Vincular GCode do StlFiles (botão + input ao lado)
- Visualizador 3D de STL — three.js com OrbitControls + STLLoader
- Sync automático agendado — background task criada (lê `sync_interval` do settings)
- Thingiverse.jsx órfão — removido (substituído pelo Settings + StlFiles)

### Settings
- Aba "Loja" — campos reais: nome, moeda, imposto, margem
- Aba "Impressoras" — campo servidor Moonraker padrão
- Aba "Custos" — campos kWh, watts, mão de obra, custo fixo, taxa e-commerce, margem
- Aba "Financeiro" — categorias de entrada/saída, saldo inicial

### Infraestrutura
- Otimização de imagens — redimensionamento para 1920px + compressão JPEG 85% via Pillow no upload
- Custo filamento automático — preço por grama do Spoolman via `filament_spool_id` nas variantes
- Migração segura — `check_and_migrate` adiciona colunas via ALTER TABLE (sem deletar DB)
- Suporte PostgreSQL — via `DB_*` env vars com conexão segura
- Gráficos no Dashboard — barras por mês (produtos/pedidos/projetos) + distribuição de preços
- Autenticação — login JWT (admin/admin) + tela de login + módulo completo
- Testes — ~67 testes: dashboard, stl_projects, image upload, settings, orders, sync, services

---

## 📋 Pendentes

### 🔴 Crítico (resolvidos)
- ~~**Página de Pedidos (frontend)** — `Orders.jsx` criado com CRUD completo + status + busca/filtro.~~
- ~~**Autenticação nas rotas** — `Depends(get_current_user)` adicionado a todos os routers (exceto auth).~~
- ~~**Relacionamento Order-Product** — `OrderItem` model adicionado com FK para Order e Product, exposto na API.~~

### 🟡 Parciais / Bugs
- **Settings PATCH individuais** — Só `moonraker`, `spoolman` e `thingiverse` têm PATCH. `store`, `printers`, `costs` e `finance` só via PUT completo.
- **Jobs "Remover" não funciona** — Botão "Remover" na fila tem `onClick={() => {}}` (no-op). Não há chamada de API.
- **Produtos: double load** — `Products.jsx` dispara `loadProducts()` duas vezes ao montar (useEffect + debounce).
- **Custos fixos no modal de Produtos** — Usa `COST_DEFAULTS` hardcoded em vez de buscar de `GET /costs/settings`.
- **costs/auto/{project_id}** — Usa `asyncio.run()` dentro de endpoint síncrono (anti-pattern).
- **Dashboard: cache Moonraker** — Cache do status para não fazer HTTP a cada load.
- **labor_hours nos cálculos** — `link-gcode` e criação de variante nunca passam `labor_hours`, então mão de obra nunca é calculada.
- **taxes_fees field** — Existe no model Product mas não é usado em nenhum cálculo ou endpoint.
- **Sync: de-duplicação de arquivos** — Re-download de todos os arquivos a cada sync, mesmo se não mudaram.
- **Sync scheduler ineficiente** — Acorda a cada 60s mesmo com `sync_interval=0`.
- **Path traversal em delete_project** — `shutil.rmtree(proj_path)` não valida se path está dentro de diretórios permitidos.
- **Testes faltantes** — Sem testes para `finance`, `costs` (estimate/parse/auto), `printers` (status/stats), `jobs` (queue), `filament`.
- **axios instance** — Cada página importa `axios` diretamente; sem interceptors centralizados.
- **Image URL frágil** — `file_path.split('/').pop()` quebra se houver subdiretórios.
- **Orders: paginação + filtros** — Adicionar filtros (status, data) e paginação no backend.

### ⬆️ Bloqueado (Requisitos externos)
- **Shopee integration** — Webhook/polling para importar pedidos. ⚠️ Requer CNPJ + App registrado na Shopee Open Platform (https://open.shopee.com). Sem previsão.

---

**Resumo:** 30 concluídos | 0 críticos | 12 parciais | 1 bloqueado

_Última atualização: Julho 2026_
