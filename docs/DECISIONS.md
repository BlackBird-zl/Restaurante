# Decisões e versões resolvidas

Registo das versões fixadas e das correções mínimas feitas ao contrato (Briefing → Arquitetura → Plano).
Cada entrada diz **o quê**, **porquê** e **o impacto**. Nada aqui redesenha o produto.

## 1. Versões resolvidas (fixadas no `package.json` e `pnpm-lock.yaml`)

| Componente | Versão | Nota |
|---|---|---|
| Node.js | 22.22.2 (`.node-version`) | LTS disponível no ambiente de construção |
| pnpm | 10.28.0 (`packageManager`) | |
| Next.js | 16.3.6 (App Router, Turbopack) | `src/proxy.ts` substitui `middleware.ts`; `params`, `cookies()` e `headers()` são assíncronos; `next lint` deixou de existir (ESLint 9 direto) |
| React / React DOM | 19.3.0 | |
| TypeScript | 5.9.3 (`strict`, `noUncheckedIndexedAccess`) | |
| @supabase/supabase-js / @supabase/ssr | 2.117.2 / 0.12.7 | Sessão staff por cookies com `getClaims()` |
| @tanstack/react-query | 5.104.0 | Snapshots + polling de reconciliação |
| zod | 4.6.5 | Schemas estritos nas bordas HTTP |
| qrcode | 1.5.4 | QR gerado por biblioteca (SVG/PNG, correção M, zona de silêncio 4 módulos) |
| sharp | 0.35.5 | Validação/recodificação de uploads e placeholders |
| Vitest | 4.1.11 | Projetos `unit` e `integration` |
| Playwright | 1.56.1 | Coincide com o Chromium pré-instalado (build 1194) |
| ESLint | 9.39.5 + eslint-config-next 16.3.6 | |
| PostgreSQL (local) | 16.13 + pgTAP | Supabase CLI usa 17; o SQL é compatível com ambos |
| Supabase Auth (local) | v2.197.0 | Binário oficial (GoTrue) |
| PostgREST (local) | 14.0 | |
| Supabase Storage (local) | `supabase/storage` master de 2026‑09‑25, backend `file` | Só para a stack sem Docker |

Fontes: Newsreader e IBM Plex Sans servidas localmente a partir de `public/fonts` (licença OFL incluída), sem pedidos a terceiros.

## 2. Ambiente de construção

- **Docker indisponível** (registos devolveram 403). Foi criada uma stack local equivalente sem Docker em `scripts/local-stack/`: PostgreSQL 16 com os papéis Supabase (`anon`, `authenticated`, `service_role`, `authenticator`, `supabase_auth_admin`, `supabase_storage_admin`), Supabase Auth, PostgREST, Storage API, Mailpit e um gateway Node em `:54321` com os mesmos prefixos (`/auth/v1`, `/rest/v1`, `/storage/v1`). O caminho oficial com `supabase start` continua suportado (`supabase/config.toml`).
- **Supabase Realtime não corre localmente** (só existe como imagem Docker/Elixir). O gateway responde 503 em `/realtime/v1`; a aplicação entra em modo "Atualização automática" (polling 3–4 s com jitter). O caminho de polling foi testado; o caminho WebSocket (canal `staff_invalidations` com RLS por destinatário) está implementado e as políticas RLS estão testadas em pgTAP, mas **a entrega por WebSocket não foi exercida** — fica para staging.
- O servidor `next dev` do Turbopack chegou a 5,4 GB de memória após horas de sessão e degradou o PostgreSQL local por falta de RAM; as suites finais correram contra `next build && next start`.

## 3. Correções mínimas ao contrato

1. **Alergénios**: códigos dos 14 alergénios do Regulamento (UE) 1169/2011. A amêndoa usa `frutos_casca_rija` (frutos de casca rija), não um código próprio.
2. **Validade do código de 6 dígitos**: 4 horas desde a abertura/rotação. O Briefing não fixava valor; 4 h cobre um serviço longo sem manter códigos válidos entre serviços. A equipa pode gerar novo código a qualquer momento.
3. **Digest do código**: calculado no servidor (HMAC com `GUEST_PIN_PEPPER`, ligado ao restaurante) e enviado à RPC; o código em claro nunca é guardado e só é mostrado uma vez ao funcionário.
4. **`expectedVisitRevision` no pedido de conta**: aceite mas não exigido. Pedir a conta é idempotente por visita e não depende de o cliente ter visto a última revisão; a caixa confirma versão e total no fecho.
5. **CSP**: `script-src` com nonce por pedido; `style-src 'unsafe-inline'` mantido porque o React/Next injeta estilos inline (tokens de tema como variáveis CSS). Não há HTML de utilizador renderizado.
6. **Uploads**: SVG, GIF e HEIC recusados; apenas JPEG/PNG/WebP/AVIF verificados por assinatura. O original **não é guardado**: só variantes recodificadas (EXIF/GPS removidos) vão para o bucket público. Por isso o bucket privado existe mas não é usado na V1.
7. **Reservas**: horas indicativas em múltiplos de 30 min dentro do horário publicado, terminando 60 min antes do fecho; tempo mínimo de preenchimento 2,5 s + honeypot, com rejeição explícita (sem falso sucesso). Limite 3 pedidos/hora por IP e restaurante.
8. **Media placeholder**: os 32 espaços visuais do Pátio usam placeholders SVG sem fotografia (`source_type = 'placeholder'`), aprovados apenas como placeholders para que as páginas possam ser publicadas e revistas. São sempre rotulados "Fotografia pendente · placeholder". Ver `ASSETS.md`.
9. **Assinatura "A mesa pede tempo."**: passou a ser conteúdo do tenant (`home.intro.signature`, `about.signature`), editável no admin. Estava fixa no componente e aparecia no site do Balcão — detetado pelo teste de isolamento de conteúdo.
10. **Limites anti‑abuso de convidado** (valores concretos para o que o contrato descrevia qualitativamente): 3 pedidos/min por sessão, 30/min por visita, 1 chamado/20 s por sessão e 6/min por visita, 40 snapshots/min por sessão, 30 leituras de QR/min por IP, 5 códigos errados por contexto QR em 10 min, 20 sessões/hora por visita. Tentativas rejeitadas por validação são revertidas com a transação e não consomem quota.
11. **Reset da demo** limpa também todos os contadores de rate limit (a chave é um hash sem coluna de tenant). Só corre fora de produção e apenas sobre tenants `is_demo`.
12. **IP do cliente**: primeiro valor de `X-Forwarded-For`. Em Vercel esse cabeçalho é definido pela plataforma. Num alojamento próprio é obrigatório um proxy que o reescreva; caso contrário um cliente poderia contornar limites por IP (os limites por sessão/visita/contexto mantêm-se).
13. **`robots.txt` dos restaurantes demo** devolve `Disallow: /` e as páginas levam `noindex`; tenants reais são indexáveis.
14. **Provisionamento de tenant** é um script de operador (`pnpm provision:tenant`), não uma UI de self‑service — o contrato não pedia onboarding público. Tenants novos nascem com pedidos em pausa e páginas por publicar.
15. **Sessões Playwright** correm em série (`workers: 1`) porque partilham o estado da demo.
