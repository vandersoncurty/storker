# Checklist de Funcionalidades

## 🔴 Crítico (essencial)
- [ ] **Página de Pedidos (frontend)** — Backend completo (`/orders/` com CRUD + status), mas não existe `Orders.jsx`. O menu "Pedidos" na sidebar renderiza "Em breve."
- [ ] **Autenticação nas rotas** — `get_current_user` existe em `auth.py` mas **nenhuma rota usa** `Depends(get_current_user)`. Todas as APIs são públicas.
- [ ] **Shopee integration** — Webhook/polling para importar pedidos automaticamente. Nada implementado.
- [ ] **Relacionamento Order-Product** — `Order` não tem `OrderItem` nem FK para `Product`. Pedidos não rastreiam quais produtos foram vendidos.

## 🟠 Previstos (módulos grandes)
- [x] **`printers`** — router + página Impressoras + status/controle Moonraker + progress bar + temperaturas + auto-refresh 3s
- [x] **`filament`** — router + página Filamento + conexão Spoolman (spools, filament types, vendor, price, density)
- [x] **`jobs`** — router + página com fila de impressão do Moonraker + enviar para fila
- [x] **`costs`** — calculadora de custo + GCode parser + settings persistidos + auto-set em variantes
- [x] **`variants`** — variantes de produto CRUD com preço automático (filamento + energia + mão de obra + margem)
- [x] **`dark-mode`** — toggle manual com localStorage + preferência do sistema como fallback
- [x] **`finance`** — controle de caixa (entradas/saídas, saldo, filtros por período, auto-registro de vendas)
- [ ] **Shopee** — webhook/polling para importar pedidos (pendente)

## 🟡 Incompletos / Parciais
- [x] Sync automático agendado — background task criada (lê `sync_interval` do settings)
- [x] Visualizar arquivos dentro do projeto STL — modal "Editar" lista STLs e GCode
- [x] Download individual de STL/GCode do StlFiles (ícones de download)
- [x] Vincular GCode do StlFiles (botão + input ao lado)
- [x] Aba "Loja" vazia — campos reais: nome, moeda, imposto, margem
- [x] Aba "Impressoras" vazia — campo servidor Moonraker padrão
- [x] Aba "Custos" vazia — campos kWh, watts, mão de obra, custo fixo, taxa e-commerce, margem
- [x] "Enviar para fila" — funcional com upload para Moonraker + opção de iniciar impressão
- [x] Thingiverse.jsx órfão — removido (substituído pelo Settings + StlFiles)
- [ ] **Itens de pedido** — `Order` sem relação com `Product` (pendente)
- [ ] **Settings PATCH individuais** — Só `moonraker`, `spoolman` e `thingiverse` têm PATCH. `store`, `printers`, `costs` e `finance` só via PUT completo.
- [ ] **Jobs "Remover" não funciona** — Botão "Remover" na fila tem `onClick={() => {}}` (no-op). Não há chamada de API.
- [ ] **Produtos: double load** — `Products.jsx` dispara `loadProducts()` duas vezes ao montar (useEffect + debounce).
- [ ] **Custos fixos no modal de Produtos** — Usa `COST_DEFAULTS` hardcoded em vez de buscar de `GET /costs/settings`.
- [ ] **costs/auto/{project_id}** — Usa `asyncio.run()` dentro de endpoint síncrono (anti-pattern, quebra se event loop já estiver rodando).

## 🔵 Melhorias / Polimento
- [x] Controles da impressora — pause/resume/cancel + progress bar + temperaturas + auto-refresh 3s
- [x] Enviar GCode para impressora — botão "enviar para fila" e "imprimir agora" no StlFiles
- [x] Dark mode toggle — botão na sidebar com persistência
- [x] Otimização de imagens — redimensionamento para 1920px + compressão JPEG 85% via Pillow no upload
- [x] Custo filamento automático — preço por grama do Spoolman (opcional via `filament_spool_id` nas variantes)
- [x] Migração segura — `check_and_migrate` adiciona colunas via ALTER TABLE (sem deletar DB)
- [x] Suporte PostgreSQL — via `DB_*` env vars com conexão segura
- [x] Visualizador 3D de STL — three.js com OrbitControls + STLLoader no modal Editar
- [x] Gráficos no Dashboard — barras por mês (produtos/pedidos/projetos) + distribuição de preços
- [x] Autenticação — login JWT (admin/admin) + tela de login + módulo completo
- [x] Testes — ~67 testes: dashboard, stl_projects, image upload, settings, orders, sync, services
- [ ] **Página de Pedidos (frontend)** — Criar `Orders.jsx` com listagem, status, criação
- [ ] **Proteção de rotas** — Aplicar `Depends(get_current_user)` nos routers
- [ ] **Settings: PATCH parciais** — Adicionar PATCH para `store`, `printers`, `costs`, `finance`
- [ ] **Jobs: remover da fila** — Implementar `DELETE /jobs/queue/{job_id}` e conectar frontend
- [ ] **Produtos: corrigir double load** — Remover chamada redundante no useEffect
- [ ] **Produtos: cost defaults do backend** — Substituir `COST_DEFAULTS` por chamada a `GET /costs/settings`
- [ ] **costs/auto: tornar async** — Substituir `asyncio.run()` por endpoint async
- [ ] **Orders: paginação + filtros** — Adicionar filtros (status, data) e paginação
- [ ] **Dashboard: cache Moonraker** — Cache do status para não fazer HTTP a cada load
- [ ] **labor_hours nos cálculos** — `link-gcode` e criação de variante nunca passam `labor_hours`, então mão de obra nunca é calculada
- [ ] **taxes_fees field** — Existe no model Product mas não é usado em nenhum cálculo ou endpoint
- [ ] **Sync: de-duplicação de arquivos** — Re-download de todos os arquivos a cada sync, mesmo se não mudaram
- [ ] **Sync scheduler ineficiente** — Acorda a cada 60s mesmo com `sync_interval=0`
- [ ] **Path traversal em delete_project** — `shutil.rmtree(proj_path)` não valida se path está dentro de diretórios permitidos
- [ ] **Testes faltantes** — Sem testes para `finance`, `costs` (estimate/parse/auto), `printers` (status/stats), `jobs` (queue), `filament`
- [ ] **axios instance** — Cada página importa `axios` diretamente; sem interceptors centralizados
- [ ] **Image URL frágil** — `file_path.split('/').pop()` quebra se houver subdiretórios

---

**Total:** 15 concluídos, 4 críticos pendentes, 5 parciais, 17 melhorias

_Última atualização: Julho 2026_
