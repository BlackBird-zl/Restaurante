# restaurant-os — V1

Plataforma multi‑restaurante: site público editorial por restaurante, carta, pedidos à mesa por QR + código
de 6 dígitos, cozinha/bar (KDS), salão, caixa com registo de pagamento externo, reservas com confirmação humana,
backoffice e analytics derivados da base de dados. Demo principal: **Pátio do Ferro**; segundo tenant de
isolamento: **Balcão do Largo**.

Especificação: `docs/RESTAURANTE_SAAS_V1_*.md`. Decisões e versões: `docs/DECISIONS.md`. Operação:
`docs/OPERATIONS.md`. Resultados de testes: `QA_REPORT.md`. Imagens: `ASSETS.md`.

## Stack

Next.js 16 (App Router, `src/proxy.ts`) · React 19 · TypeScript strict · Supabase (PostgreSQL, Auth, Storage,
Realtime) · SQL migrations com RLS/grants/RPCs · TanStack Query · Zod · Vitest · Playwright · pgTAP · pnpm.
Versões exatas em `package.json`/`pnpm-lock.yaml` e `docs/DECISIONS.md`.

## Arquitetura em 6 linhas

- Todas as tabelas de negócio estão no schema `app_private` (RLS ativo, sem grants). O browser nunca lhes toca.
- A única superfície de dados são RPCs `SECURITY DEFINER` com `search_path=''`: `site_*` (público), `staff_*`
  (membro autenticado; papel/tenant verificados em cada chamada), `guest_*`/`system_*` (só `service_role`, chamados
  pelo servidor depois de validar o segredo do convidado).
- Route Handlers (`src/app/api/v1/**`) são finos: mesma origem, `Idempotency-Key`, schema Zod estrito, uma RPC.
- `src/proxy.ts` resolve o tenant pelo **Host** (`{slug}.APP_BASE_DOMAIN` ou domínio verificado), remove cabeçalhos
  `x-ros-*` vindos do browser e reescreve para `/internal-sites/{slug}`. Staff vive num host central (`APP_STAFF_HOST`).
- Dinheiro em cêntimos inteiros; preços e totais calculados só na base de dados; idempotência + locks ordenados.
- Sincronização: invalidações por Supabase Realtime (tabela `staff_invalidations`, RLS por destinatário) + polling
  de reconciliação; o convidado usa polling a cada 3 s. Sem ligação → ações bloqueadas, nunca falso sucesso.

## Requisitos

- Node 22 (`.node-version`) e pnpm 10 (`corepack enable`).
- **Opção A (recomendada):** Supabase CLI + Docker.
- **Opção B:** sem Docker — PostgreSQL 16 + pgTAP e binários descarregados (ver abaixo). Foi a usada na construção.

## Arranque local

```bash
pnpm install

# Opção A — Supabase CLI
supabase start                      # aplica supabase/migrations e cria os buckets de config.toml
eval "$(supabase status -o env | sed 's/^/export /')"
bash scripts/local-stack/write-env.sh   # gera .env.local com as chaves locais e segredos aleatórios

# Opção B — stack sem Docker (Linux)
#   PostgreSQL 16 em /usr/lib/postgresql/16 + pgTAP; binários em $LOCAL_STACK_DIR (/opt/localstack):
#   auth/ (supabase/auth release v2.197.0), postgrest (v14.0), mailpit, e opcionalmente storage-src/
#   (git clone https://github.com/supabase/storage; npm install --force; npm rebuild fs-xattr --nodedir=<prefixo node>)
pnpm local:up                        # Postgres :54322, gateway :54321, Mailpit :54324, Storage (se instalado)
bash scripts/local-stack/write-env.sh

# Comum
pnpm db:migrate                      # idempotente (regista em supabase_migrations.schema_migrations)
pnpm seed:demo                       # cria Pátio do Ferro + Balcão do Largo e os utilizadores demo
pnpm dev                             # ou: pnpm build && pnpm start
```

Abrir:

| O quê | URL local |
|---|---|
| Site Pátio do Ferro | http://patio-do-ferro.localhost:3000 |
| Site Balcão do Largo | http://balcao-do-largo.localhost:3000 |
| Pré‑visualização por caminho (só não‑produção) | http://localhost:3000/d/patio-do-ferro |
| Login da equipa | http://localhost:3000/entrar |
| Emails locais (recuperação, convites) | http://127.0.0.1:54324 (Mailpit) |

Chrome/Chromium resolvem `*.localhost` para 127.0.0.1. Noutros browsers adicione as entradas ao `/etc/hosts`.

## Utilizadores demo

As palavras‑passe **não estão no repositório**. São derivadas de `DEMO_SEED_PASSWORD` (em `.env.local`) por
utilizador — `<DEMO_SEED_PASSWORD>.<nome>` — e o seed escreve‑as em `.demo-credentials.local.json` (ignorado pelo git).

| Pessoa | Email | Função |
|---|---|---|
| Marta Azevedo | marta@patio.example | Proprietária / administração |
| Diogo Reis | diogo@patio.example | Administração |
| Rui Matos, Sara Vale | rui@ / sara@patio.example | Salão |
| Inês Rocha | ines@patio.example | Cozinha (COZ) |
| Tomás Cruz | tomas@patio.example | Bar (BAR) |
| Leonor Alves | leonor@patio.example | Caixa |
| Joana Pires | joana@balcao.example | Proprietária do Balcão do Largo |
| Teste Multi | multi@teste.example | Admin no Pátio, bar no Balcão (troca de tenant) |

Estado inicial do Pátio (Plano §4): 14 mesas, 4 em atendimento (Mesa 12 com conta pedida), 6 pedidos,
56,00 € recebidos (36,00 cartão externo + 20,00 numerário), 3 chamados ativos, 2 linhas atrasadas na Mesa 08.

Repor a demo: `pnpm reset:demo --confirm=reset-demo` (recusa em `APP_ENV=production` e só toca em tenants demo;
gera novos tokens QR e códigos, por isso QR impressos e cookies antigos deixam de funcionar).

## Roteiro de demonstração (Plano §6)

1. Home do Pátio no telemóvel → carta, ambiente, reserva (pedido pendente). Abrir o Balcão para ver outra marca.
2. Rui (`/r/patio-do-ferro/op/salao`) → Mesa 14 → **Abrir atendimento e gerar código** (mostrado uma vez).
3. Marta → Administração → Mesas e QR → imprimir/abrir QR da Mesa 14; no telemóvel ler o QR e introduzir o código.
4. Adicionar 2× Hambúrguer do Pátio, 1× Batata frita, 2× Cola → **40,50 €** → enviar. Recarregar: persiste.
5. Inês (`op/cozinha`) e Tomás (`op/bar`) veem só as suas linhas; iniciar e marcar pronto.
6. Rui: "Vou levar" → "Entregue". O cliente vê o estado a mudar.
7. Cliente → Ajuda → Talheres; Rui/Sara assumem (só um fica responsável) e concluem.
8. Cliente → Conta → Pedir a conta (não é pagamento). Leonor (`op/caixa`) confere e regista o recebimento externo.
   A mesa fica livre e o telemóvel do cliente perde o acesso.
9. Marta muda o preço do hambúrguer para 16,00 €: a carta muda, a conta fechada mantém 40,50 €.
10. Administração → Analytics: recebimentos passam de 56,00 € para 96,50 € no mesmo dia operacional.

## Comandos

| Comando | Faz |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Aplicação |
| `pnpm typecheck` / `pnpm lint` | TypeScript e ESLint |
| `pnpm test:unit` | Vitest — funções puras (dinheiro, dia operacional/DST, estados, cripto, host, tema, schemas) |
| `pnpm test:db` | pgTAP — grants/RLS, isolamento, transações, KDS/caixa, admin, analytics (requer seed acabado de repor) |
| `pnpm test:integration` | Vitest HTTP contra a app a correr (repõe a demo antes) |
| `pnpm test:e2e` | Playwright multi‑contexto (repõe a demo antes; `QA_NO_WEBSERVER=1` para usar um servidor já ativo) |
| `node scripts/qa/admin-flow.mjs` | Verificação manual assistida das páginas de admin e do pipeline de upload |
| `pnpm tsx scripts/qa/load.ts` | Carga reduzida: 50 sessões, 50 pedidos simultâneos, 20 leitores staff |
| `pnpm db:migrate` / `pnpm seed:demo` / `pnpm reset:demo --confirm=reset-demo` | Base de dados e demo |
| `pnpm provision:tenant --slug=… --name=… --owner-email=…` | Criar restaurante real (ver OPERATIONS) |
| `pnpm retention:run` | Retenção diária |
| `pnpm assets:build` | Regenera placeholders e `assets/visual-manifest.json` |
| `pnpm secrets:scan` | Procura segredos/ficheiros proibidos nos ficheiros versionados |
| `pnpm local:up` / `pnpm local:down` | Stack local sem Docker |

## Variáveis de ambiente

Ver `.env.example` (nomes e significado, sem valores reais). `SUPABASE_SERVICE_ROLE_KEY`, `GUEST_PIN_PEPPER`,
`QR_ENCRYPTION_KEY`, `QR_CONTEXT_SECRET` e `RATE_LIMIT_SALT` são só do servidor; nenhuma variável secreta tem
prefixo `NEXT_PUBLIC_`. O ESLint impede importar o cliente privilegiado em componentes cliente.

## Deploy (resumo; detalhe em `docs/OPERATIONS.md`)

Vercel (`vercel.json`) + projeto Supabase. Aplicar migrations com `pnpm db:migrate` (ou `supabase db push`),
criar buckets `restaurant-media-public` (público) e `restaurant-media-private`, configurar SMTP no Supabase Auth,
wildcard DNS `*.APP_BASE_DOMAIN` + domínio do staff, variáveis de ambiente de produção e o job diário de retenção
(`.github/workflows/retention.yml`). **Não foi feito deploy nesta construção** (sem credenciais de Vercel/Supabase).

## Limitações reais

- **Fotografias**: as 32 imagens do Pátio estão pendentes; o site usa placeholders identificados (`ASSETS.md`).
  A apresentação comercial final (gate G5 do Plano) depende dessas fotografias.
- **Realtime por WebSocket** não foi exercido (sem servidor Realtime local); o polling foi testado.
- Sem staging: nada foi testado num ambiente remoto, com SMTP real, domínio próprio ou Vercel.
- Sem testes em dispositivos físicos (Safari iOS / Chrome Android, câmara a ler QR impresso); o QR foi descodificado
  a partir do PNG gerado.
- O registo de pagamento **não é faturação fiscal** nem integra terminal de pagamento; o restaurante continua a
  emitir a fatura no seu sistema certificado.
- Reservas não enviam emails/SMS: a confirmação é feita pela equipa por telefone/email próprio e registada.
- Provisionamento de restaurantes e verificação de domínios próprios são tarefas de operador (script + DNS).
