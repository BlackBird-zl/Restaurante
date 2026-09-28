# QA_REPORT — restaurant-os V1

Tudo o que está marcado como aprovado foi **executado** nesta construção; o resto está marcado como parcial ou
não executado, com o motivo. Nenhum teste foi corrido contra staging/produção (não existem).

## Ambiente

| | |
|---|---|
| Data | 27–28 set 2026 (Europe/Lisbon) |
| Máquina | Contentor Linux, 8 GB RAM, sem Docker |
| Runtime | Node 22.22.2, pnpm 10.28.0 |
| Base de dados | PostgreSQL 16.13 + pgTAP, papéis Supabase replicados (`scripts/local-stack`) |
| Serviços | Supabase Auth v2.197.0, PostgREST 14.0, Supabase Storage (backend `file`), Mailpit, gateway `:54321` |
| Realtime | **indisponível** (sem Docker) → caminho de polling |
| App | `next build && next start` (execução final); `next dev` durante o desenvolvimento |
| Browser | Chromium 1194 headless via Playwright 1.56.1 (contextos separados por papel) |

## Resultados finais (última execução)

| Suite | Comando | Resultado |
|---|---|---|
| TypeScript | `pnpm typecheck` | ✅ sem erros |
| ESLint | `pnpm lint` | ✅ sem erros |
| Build de produção | `pnpm build` | ✅ |
| Unitários | `pnpm test:unit` | ✅ 49/49 (5 ficheiros) |
| Base de dados (pgTAP) | `pnpm reset:demo … && pnpm test:db` | ✅ 168/168 (5 ficheiros) |
| Integração HTTP | `pnpm test:integration` | ✅ 53/53 (5 ficheiros, app real + base real) |
| E2E | `pnpm test:e2e` | ✅ 12/12 (3 ficheiros) |
| Admin + upload (assistido) | `node scripts/qa/admin-flow.mjs` | ✅ 28/28 |
| Carga reduzida | `pnpm tsx scripts/qa/load.ts` | ✅ 50/50 pedidos, 0 duplicados (números abaixo) |
| Segredos | `pnpm secrets:scan` | ✅ limpo |

## Matriz do Plano §5

Legenda: ✅ executado e aprovado · 🟡 parcial (ver nota) · ⛔ não executado.
Fontes: **DB** = `supabase/tests/*.sql`, **INT** = `tests/integration`, **E2E** = `tests/e2e`, **ADM** = `scripts/qa/admin-flow.mjs`.

### Autenticação, RBAC e tenants
| ID | Estado | Evidência |
|---|---|---|
| A01 | ✅ | INT 04: erro neutro igual para conta existente/inexistente, logout invalida a sessão, email de recuperação entregue no Mailpit; E2E: erro de login. Renovação de token não testada isoladamente |
| A02 | ✅ | DB 010 (preços, pagamentos, roles); INT 03 (cozinha 403 em salão, caixa, equipa, analytics) |
| A03 | 🟡 | DB: membro suspenso perde acesso na chamada seguinte. Parte "socket aberto" não exercida (sem Realtime) |
| A04 | ✅ | DB: não promove a admin, não suspende owner, não aceita convite de outro email |
| T01 | ✅ | DB + INT 03 (UUIDs de A via slug de B → 404/403) |
| T02 | ✅ | DB (FKs compostas + RPC) + INT 02 (item de outro tenant recusado) |
| T03 | ✅ | DB 001 (grants, RLS, EXECUTE por prefixo, `search_path` fixo) |
| T04 | 🟡 | DB: RLS de `staff_invalidations` só devolve linhas do destinatário. Filtro manipulado num canal WebSocket real não testado |
| T05 | ✅ | DB (admin A / bar B) |

### QR, sessão e pedidos
| ID | Estado | Evidência |
|---|---|---|
| Q01 | ✅ | DB + INT 02 (token inválido → redirecionamento neutro, sem cookie) + INT 04 (revogado) |
| Q02 | ✅ | INT 02: carta pública 200; pedido/chamado sem sessão 401 |
| Q03 | ✅ | DB + INT 02: código errado 400, bloqueio 429, código certo também bloqueado durante o bloqueio |
| Q04 | ✅ | DB (2 dispositivos, mesma visita) + carga (5 dispositivos por mesa) |
| Q05 | ✅ | DB + INT 03 + E2E (após fecho: sessão 401/410, ecrã "Este atendimento terminou") |
| Q06 | ✅ | DB (abertura concorrente → uma visita) |
| Q07 | ✅ | INT 04: reimpressão mantém URL, rotação exige confirmação, QR antigo → "revogado", sessões terminadas. Token sai do URL por 303 + `Referrer-Policy: no-referrer`; logs não auditados |
| O01 | ✅ | DB (4050, tickets COZ/BAR) + E2E (40,50 € no carrinho e na conta após reload) |
| O02 | ✅ | DB + INT 02 (campos extra 400, preço adulterado → 409) |
| O03 | ✅ | INT 02: 20 pedidos simultâneos com a mesma key → 1 pedido |
| O04 | ✅ | DB + INT 02 (409 IDEMPOTENCY_CONFLICT) |
| O05 | ✅ | DB (replay devolve o pedido original) |
| O06 | ✅ | DB (dois pedidos legítimos na mesma conta) |
| O07 | ✅ | DB + INT 02 (indisponível aborta tudo, nada parcial). Preservação do carrinho na UI não automatizada |
| O08 | 🟡 | INT 04: mudança de preço aplica-se só a novos pedidos. Mudança de estação após envio coberta por snapshot na DB, sem teste dedicado |

### Realtime, cozinha e salão
| ID | Estado | Evidência |
|---|---|---|
| R01 | ⛔ | Sem servidor Realtime local; meta ≤ 2 s por WebSocket não medida |
| R02 | ✅ | E2E: KDS em "Atualização automática" recebeu pedido novo em 1,9 s (clique→ticket, polling) |
| R03 | ✅ | E2E: convidado e cozinha offline → "Sem ligação", botões desativados, recuperação ao voltar |
| R04 | ⛔ | Revisões monotónicas implementadas; eventos duplicados/atrasados não simulados |
| R05 | ⛔ | Não medido (subscrições/sons duplicados após 10 entradas) |
| K01–K04 | ✅ | DB (caminho válido, saltos recusados, estação alheia, batch com versão antiga aborta tudo); INT 03 (K02 por HTTP) |
| S01–S06 | ✅ | DB. E2E cobre assumir/concluir chamado e recolher/entregar com um funcionário |

### Conta, administração e métricas
| ID | Estado | Evidência |
|---|---|---|
| B01–B03 | ✅ | DB + INT 03 (pedido de conta bloqueia novos pedidos; settle com pendentes → PENDING_ITEMS) |
| B04 | ✅ | DB + INT 03: dois caixas em simultâneo → 200 + 409, um único pagamento |
| B05, B06 | ✅ | DB + INT 03 (total adulterado → VERSION_CONFLICT) |
| B07, B08 | ✅ | DB + INT 03 (conta fechada: settle/void → 409) |
| M01, M02 | ✅ | DB + INT 04 |
| M03 | ⛔ | Ocultar categoria / arquivar produto destacado sem teste automatizado |
| M04 | ✅ | DB |
| M05 | 🟡 | DB (contraste) + INT 04 (rascunho não muda o site, publicar muda, HTML recusado). Presets: casa‑editorial e balcão‑claro vistos em produção; noite‑gráfica visto só na pré‑visualização de rascunho |
| M06 | 🟡 | ADM: SVG disfarçado de JPEG recusado, EXIF removido, cozinha 403; DB: media de outro tenant. Ficheiro > 10 MB e executável renomeado não testados |
| M07 | ✅ | DB + INT 04 (convite entregue no Mailpit; salão não convida) |
| N01 | ✅ | DB + INT 00: 6 pedidos, 13 linhas, 18 unidades, 5600 (3600/2000), 4 ativas, 10 livres, 1 conta pedida, 12800 em aberto, 3 chamados (2/1), espera 60 s, COZ 756 s n=5, BAR 90 s n=6, 2 atrasos na Mesa 08 |
| N02, N03 | ✅ | DB + unitários (04:59/05:00, mudanças de hora de março e outubro, horas inexistentes/ambíguas) |
| N04, N05 | ✅ | DB + INT 03 (honeypot, tempo mínimo, fora de horas, confirmar exige contacto, retenção anonimiza) |
| D01 | ✅ | Seed corrido duas vezes: "already present — nothing changed", totais iguais |
| D02 | ✅ | INT 04: sem confirmação, `APP_ENV=production` e tenant não‑demo → recusado |
| D03 | 🟡 | Reset apaga sessões e gera tokens novos (por construção); sem teste que reutilize o cookie antigo |
| D04 | ✅ | INT 01 + E2E (sites, carta e APIs isolados; utilizador multi‑tenant em DB) |

### Browser, mobile, erros e capacidade
| ID | Estado | Evidência |
|---|---|---|
| U01 | 🟡 | E2E: crawl de todos os links internos dos dois sites sem 4xx/5xx; ADM: 15 páginas de admin 200. Back/forward não testados |
| U02 | 🟡 | E2E: Home/Carta/Reservas sem overflow a 320/360/390/768/1024/1440; KDS 1024×768; admin a 390. Nem todas as páginas em todas as larguras |
| U03 | ⛔ | Teclado, zoom 200 % e safe area não automatizados |
| U04 | 🟡 | 429 e offline verificados; 500/timeout não simulados |
| U05 | 🟡 | Tenant novo sem carta (`provision:tenant`) serve todas as páginas 200; sem revisão visual |
| U06 | ⛔ | Reduced motion/som/daltonismo não verificados |
| U07 | ⛔ | Sem fotografias reais (ver ASSETS.md) |
| U08 | 🟡 | Versão reduzida: 10 mesas × 5 dispositivos = 50 sessões, 50 pedidos simultâneos → 50×201, 50 no DB, p50 1135 ms / p95 1277 ms; 20 leitores staff sem erros (p95 1052 ms). Não foi criado o tenant de 50 mesas; IPs simulados por `X-Forwarded-For` |
| U09 | ⛔ | Sem dispositivos físicos; QR descodificado do PNG gerado (jsQR) |
| U10 | 🟡 | Build ok, consola sem erros nas páginas públicas, sem segredos no bundle cliente (ESLint + scan). Tamanho de bundle não analisado |

## Screenshots revistos

Vistos durante a QA (não versionados; gerados por `scripts/qa/*.mjs` e Playwright): Home Pátio desktop e 320/390 px,
header com CTA de reserva, carta, carrinho e confirmação na mesa (390), KDS cozinha/bar (1280 e 1024×768), salão com
código, caixa, as 15 páginas de admin (1440) e 3 em 390, editor do site, biblioteca de media após upload,
pré‑visualização com preset noite‑gráfica (1280 e 390).

## Defeitos encontrados e corrigidos durante a QA

1. **Fuga de conteúdo entre tenants**: a assinatura "A mesa pede tempo." estava fixa no componente e aparecia no
   site do Balcão (INT 01). Passou a ser conteúdo do tenant.
2. **320 px**: overflow horizontal no header (wordmark + menu) e preços comprimidos nos destaques. Corrigido.
3. **CTA "Pedir reserva"** no header sem padding (especificidade CSS). Corrigido.
4. **Acessibilidade**: miniaturas dentro de links repetiam o alt do placeholder no nome do link; agora decorativas.
5. **Noite gráfica**: texto do hero sem contraste garantido sobre imagens claras; adicionado véu e etiqueta de
   placeholder legível.
6. **Hooks React** (lint `react-hooks`): leitura de refs durante o render nos indicadores de ligação; passou a usar
   `dataUpdatedAt` do TanStack Query.
7. **Reset da demo** mantinha contadores de rate limit (reservas bloqueadas após reset). Corrigido.
8. **Stack local**: `up.sh` ficava preso por processos herdarem o terminal (`setsid` + `</dev/null`).

## Bloqueios e não executado

- Realtime por WebSocket, staging, SMTP real, domínio próprio, Vercel, dispositivos físicos: indisponíveis neste ambiente.
- Fotografias: nenhuma ferramenta de imagem com créditos → 32 placeholders identificados.
- CI (`.github/workflows/ci.yml`) escrito mas nunca executado.
