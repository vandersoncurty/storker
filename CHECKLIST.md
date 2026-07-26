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
- Enviar GCode para impressora — botão "enviar para fila" e "imprimir agora" no FileExplorer
- "Enviar para fila" — funcional com upload para Moonraker + opção de iniciar impressão
- **Jobs "Remover"** — botão funcional com chamada `DELETE /jobs/queue` ao Moonraker

### STL e Arquivos
- Upload de ZIP (extraído no backend)
- Criação automática de Product ao definir título do projeto
- Excluir produtos / projetos STL / imagens pelo frontend
- Busca e filtro de produtos (search + is_sliced)
- Visualizar arquivos dentro do projeto STL — modal "Editar" lista STLs e GCode
- Download individual de STL/GCode do FileExplorer (ícones de download)
- Vincular GCode do FileExplorer (botão + input ao lado)
- Visualizador 3D de STL — three.js com OrbitControls + STLLoader
- Sync automático agendado — background task criada (lê `sync_interval` do settings)
- StlFiles.jsx removido (substituído pelo FileExplorer.jsx unificado)

### Settings
- Aba "Loja" — campos reais: nome, moeda, imposto, margem
- Aba "Impressoras" — campo servidor Moonraker padrão
- Aba "Custos" — campos kWh, watts, mão de obra, custo fixo, taxa e-commerce, margem
- Aba "Financeiro" — categorias de entrada/saída, saldo inicial
- PATCH individual para todas as categorias (store, printers, costs, finance)

### Custos e Cálculos
- **labor_hours** — calculado automaticamente a partir do `print_time_seconds` se não fornecido
- **taxes_fees** — incluído no cálculo de custo (`CostEstimate.taxes_fees`) e no preço final
- **Custos fixos no modal de Produtos** — carrega de `GET /costs/settings` em vez de hardcoded

### Infraestrutura
- Otimização de imagens — redimensionamento para 1920px + compressão JPEG 85% via Pillow no upload
- Custo filamento automático — preço por grama do Spoolman via `filament_spool_id` nas variantes
- Migração segura — `check_and_migrate` adiciona colunas via ALTER TABLE (sem deletar DB)
- Suporte PostgreSQL — via `DB_*` env vars com conexão segura
- Gráficos no Dashboard — barras por mês (produtos/pedidos/projetos) + distribuição de preços
- Autenticação — login JWT (admin/admin) + tela de login + `Depends(get_current_user)` em todas as rotas
- **axios centralizado** — instância única em `api.js` com interceptors de auth + redirect 401
- **Image URL** — usa `split(/[/\\]/).pop()` em vez de `split('/').pop()` para suportar subdiretórios
- **Path traversal protegido** — `delete_project` valida path contra diretórios permitidos
- **Dashboard cache** — Moonraker status cacheado por 10s para evitar HTTP excessivos
- **Sync de-duplicação** — não re-download STLs se arquivo já existe no destino
- **Sync scheduler eficiente** — dorme 3600s se `sync_interval=0`, só acorda a cada `interval * 60` quando ativo
- **costs/auto/{project_id}** — substituído `asyncio.run()` por `async/await` adequado
- **Products double load** — removido debounce duplicado em `Products.jsx`
- **Testes** — 93 testes: +finance, +costs, +printers (skip), +jobs (skip), +filament (skip)
- **Orders** — busca, filtro por status, paginação via skip/limit

---

## 📋 Pendentes

### ⬆️ Bloqueado (Requisitos externos)
- **Shopee integration** — Webhook/polling para importar pedidos. ⚠️ Requer CNPJ + App registrado na Shopee Open Platform (https://open.shopee.com). Sem previsão.

---

**Resumo:** 45 concluídos | 0 críticos | 0 parciais | 1 bloqueado

_Última atualização: Julho 2026_
