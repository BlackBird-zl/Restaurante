# RESTAURANTE SAAS — Plano de execução para Claude

Versão 1.0 · 27 de setembro de 2026 · Documento de construção posterior

**Nesta fase foram produzidas especificações, não código do produto nem imagens.** Os testes descritos abaixo são requisitos para a futura implementação; não são apresentados como testes já executados.

## 1. Instrução de arranque

> Construa a V1 definida em `RESTAURANTE_SAAS_V1_Briefing.md`, `RESTAURANTE_SAAS_V1_Arquitetura_Produto.md` e neste plano. Leia os três por inteiro antes de implementar. Entregue um repositório funcional, com base de dados, autenticação, isolamento multi-tenant, site do Pátio do Ferro, mesa/QR, pedidos, estações, salão, caixa e administração. Use as regras e dados fechados nos documentos. Trabalhe autonomamente dentro desse escopo, registe impedimentos reais e não troque comportamento persistente por simulação local. A geração das imagens só acontece durante a fase visual da construção, se essa execução estiver autorizada e houver ferramenta disponível. Esta instrução não autoriza compras, mensagens externas, criação de contas pagas ou publicação pública sem o contexto correspondente.

Ordem de leitura: Briefing → Arquitetura → Plano. Fonte de verdade de estados/permissões: Arquitetura, secções 5–9. Dados do demo: Briefing, secção 7, e fixtures deste plano. Imagens: Arquitetura, secção 16. Se houver contradição detetada, registar a menor correção coerente em `docs/DECISIONS.md` e explicar; não redesenhar o produto por preferência pessoal.

### 1.1 O que significa concluir

Uma pessoa deve clonar o projeto, seguir o README, levantar Supabase local e a aplicação, carregar o seed e operar o fluxo completo em sessões independentes. Deve conseguir repetir o fluxo em staging com serviços reais configurados. Não basta uma Home navegável, dados em localStorage, login com comparação de string, cards de pedidos animados por timer ou gráficos sem origem.

Nenhuma decisão já fechada exige uma nova ronda de brainstorming. Estilo, nomes de tabelas, papéis, regras de QR, estados, preset do demo e dados estão definidos. Resolver detalhes locais mantendo os contratos. Bibliotecas auxiliares só quando evitarem trabalho necessário; não instalar um pacote para cada componente.

### 1.2 Prioridade de execução

1. Invariantes de tenant, autorização, idempotência e dinheiro.
2. Caminho Mesa → pedido misto → estações → entrega → conta, persistente e testado.
3. Site, carta, administração e demo completos.
4. Fotografia, composição, ergonomia e qualidade de apresentação.
5. Evidência de QA, operação e deploy reproduzível.

Esta ordem é uma sequência de implementação, não autorização para entregar só os dois primeiros pontos. Não iniciar inventário, delivery, IA analítica ou pagamentos integrados para “completar o produto”.

## 2. Contrato de trabalho e entregáveis da construção

| Entrega | Conteúdo obrigatório |
|---|---|
| Repositório | Código organizado segundo a Arquitetura, migrations, scripts e lockfile |
| Ambiente local | Supabase CLI/Docker documentados; seed e credenciais de teste locais; execução em um comando após prerequisites |
| Site e produto | Todas as rotas públicas e áreas por função; refresh e link direto |
| Base | Schema, constraints, RLS, grants, RPCs e testes; nenhum segredo no frontend |
| Media | Imagens individuais aprovadas, variantes, manifesto e fontes/licenças; nenhum hotlink aleatório |
| README | Setup, variáveis, comandos, utilizadores demo, fluxo de demonstração e limitações reais |
| `ASSETS.md` | Proveniência, prompts/referências, licenças e associação a produtos |
| `QA_REPORT.md` | O que foi executado, ambiente, resultados, screenshots vistos e bloqueios |
| `docs/OPERATIONS.md` | Criar tenant, verificar domínio, convidar equipa, QR, backup/restore e rollback |
| `docs/DECISIONS.md` | Versões resolvidas e mudanças justificadas dentro do contrato |
| `.env.example` | Apenas nomes e valores ilustrativos sem segredos |

Comandos esperados: `dev`, `build`, `start`, `lint`, `typecheck`, `test:unit`, `test:db`, `test:integration`, `test:e2e`, `seed:demo`, `reset:demo`, `provision:tenant`. Usar pnpm, com versão fixada no campo `packageManager`. Não guardar `node_modules`, `.next`, dumps com dados privados, `.env` reais ou artefactos temporários no Git.

Variáveis esperadas, com validação startup: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` apenas servidor, `APP_BASE_DOMAIN`, `APP_STAFF_HOST`, `APP_ENV`, `GUEST_PIN_PEPPER`, `QR_ENCRYPTION_KEY`, `QR_ENCRYPTION_KEY_VERSION`, `QR_CONTEXT_SECRET`, `RATE_LIMIT_SALT`, `DEMO_SEED_PASSWORD` apenas local/script. SMTP é configuração de Auth; documentar credenciais no secret manager, não no repo. Não é necessário `DATABASE_URL` no browser; ferramentas de migrations usam conexão/CLI protegida.

Secrets podem ter nomes compatíveis com chaves modernas do fornecedor; mapear uma única vez no módulo de configuração e documentar. Não duplicar clientes privilegiados em páginas.

## 3. Sequência de construção

### FASE 0 — Setup e reprodução

**Objetivo:** criar ambiente que qualquer implementador consegue levantar de forma repetível.

- **Arquivos/módulos:** `package.json`, lockfile, `.node-version` ou equivalente, `.env.example`, README, `supabase/config.toml`, configuração TypeScript/Next/Vitest/Playwright.
- **Funcionalidades:** aplicação base, servidor local, Supabase local, validação de variáveis, scripts de build/teste; copiar estas especificações para `docs/`.
- **Dependências:** Node LTS, pnpm, Docker/Supabase CLI disponíveis. Resolver versões estáveis compatíveis e fixá-las; não usar versões canary.
- **Critérios de aceite:** checkout limpo instala, sobe e produz build; falta de configuração dá erro útil; `.env` real ignorado pelo Git; localhost e callback de Auth definidos.
- **Testes necessários:** smoke de boot/build, verificação de variáveis faltantes e scan de segredos no diff. Não criar testes de getters triviais.
- **Riscos:** usar Node incompatível, misturar projetos Supabase ou expor secret com prefixo público. Separar local/staging/produção desde o começo.
- **Resultado esperado:** base executável e README inicial, sem funcionalidades fingidas.

### FASE 1 — Fundação de domínio e interface

**Objetivo:** estabelecer linguagem comum de dados e três contextos de uso.

- **Arquivos/módulos:** `src/modules/*/{types,schemas,dto}.ts`, `src/lib/{money,time,http}`, `src/components/ui`, tokens CSS e layouts público/mesa/operação.
- **Funcionalidades:** estados definidos, permissões estáticas, dinheiro em cêntimos, data operacional; componentes de campo, erro, diálogo, botão, lista e status; shell em 360 px e desktop.
- **Dependências:** fase 0; contratos das secções 4–6 da Arquitetura.
- **Critérios de aceite:** nenhuma string de status dispersa; formatação EUR consistente; ações alcançáveis no mobile; público, administração e KDS têm hierarquias distintas.
- **Testes necessários:** dinheiro, agregação de estados e data operacional; teclado/foco dos diálogos realmente usados. Screenshot inicial de layout, sem declarar placeholders como imagens finais.
- **Riscos:** transformar a UI num conjunto genérico de cards; misturar view models com entidades persistidas.
- **Resultado esperado:** tipos e componentes que suportam o produto, com composição inicial do Pátio.

### FASE 2 — Base, autenticação, permissões e isolamento

**Objetivo:** provar que cada ator só acede ao que lhe pertence antes de construir a operação.

- **Arquivos/módulos:** migrations de schemas/tabelas/índices, `supabase/tests`, `src/modules/auth`, clientes Supabase, páginas Auth, `tests/security`.
- **Funcionalidades:** modelo da secção 7, grants default-deny, RPCs de leitura base, membros/papéis/estações, login/convite/recuperação/logout, duas fixtures mínimas de tenant.
- **Dependências:** fases 0–1; schemas expostos limitados e Auth local a funcionar.
- **Critérios de aceite:** membro A não lê/escreve B por HTTP, RPC ou tabela; guest/anon não acedem a privados; suspensão bloqueia próxima operação; proprietário não fica sem gestão.
- **Testes necessários:** QA-A01–A04 e QA-T01–T05 abaixo; pgTAP de grants/RLS/EXECUTE; teste de escalada cozinha→admin e de FK cruzada.
- **Riscos:** SECURITY DEFINER sem guardas, helper recursivo em RLS, service_role usado nas ações de staff, invitation email não validado.
- **Resultado esperado:** fundação de segurança demonstrada em base real. Não avançar sobre falhas de isolamento.

### FASE 3 — Resolução de tenant, temas e conteúdo

**Objetivo:** ligar host, marca e dados sem copiar código.

- **Arquivos/módulos:** resolver/proxy, `modules/tenancy`, `themes`, `site`, `publicUrl`, migrations de theme/content, `tests/integration/tenancy`.
- **Funcionalidades:** host verificado → tenant; host central de staff; modo `/d/{slug}` apenas preview/local; três presets e tokens allowlisted; rascunho/preview/publicação.
- **Dependências:** fase 2; domains e membros ativos.
- **Critérios de aceite:** host desconhecido devolve 404; A/B não partilham cache ou cookies de mesa; tema muda Hero/destaques/ambiente; preços não ficam em texto duplicado.
- **Testes necessários:** hostname/porta/punycode, header spoof, acesso a path interno, cache alternando tenants, referência de media alheia, contraste dos presets.
- **Riscos:** cache por path sem host/tenant; confiar em header do browser; publicar HTML arbitrário.
- **Resultado esperado:** marca e conteúdo resolvidos e protegidos, prontos para páginas reais.

### FASE 4 — Site público e carta

**Objetivo:** construir o restaurante navegável com os mesmos dados que alimentarão os pedidos.

- **Arquivos/módulos:** rotas públicas da secção 3, `MenuList`, `ItemDetail`, `RestaurantShell`, menu/site DTOs, conteúdo do Briefing.
- **Funcionalidades:** Home com sete blocos, Carta, categorias, 24 fichas, Sobre, Ambiente, Reservas/Contactos/Privacidade; breadcrumbs, pesquisa por nome e alergénios informativos; indisponibilidade visível.
- **Dependências:** fase 3 e seed mínimo de carta; assets finais entram na fase 14. Não reimplementar preços por página.
- **Critérios de aceite:** cada link abre uma página real; refresh funciona; produto inexistente dá 404; cards e ficha concordam no preço; sem carrinho de pedido fora de sessão.
- **Testes necessários:** crawl de rotas/links, disponibilidade P07, estados vazios/pesquisa sem resultado, SSR sem JS, 360/768/1440 px, teclado e peso inicial.
- **Riscos:** página de SaaS disfarçada de restaurante, fotografia repetida para produtos diferentes, contacto fictício acionável.
- **Resultado esperado:** presença pública completa, com placeholders apenas internos e explicitamente pendentes até a fase visual.

### FASE 5 — Mesas, QR e atendimento

**Objetivo:** autorizar um grupo real por sessão sem criar contas para clientes.

- **Arquivos/módulos:** `modules/tables`, QR renderer/print, GuestContext/cookies, RPCs de abertura/entrada/revogação, rotas `/mesa`.
- **Funcionalidades:** mesas/zonas, QR 256 bits, bootstrap sem query persistente, código de seis dígitos por visita, cookie HttpOnly, vários dispositivos, expiração e rotação.
- **Dependências:** fases 2–4; segredos de PIN/cookie/cifra e HTTPS no ambiente remoto.
- **Critérios de aceite:** QR sozinho não permite pedido; duas aberturas simultâneas geram uma visita; refresh mantém sessão; fecho/revogação bloqueia credencial antiga; código não aparece no log.
- **Testes necessários:** QA-Q01–Q07; decodificar SVG/PNG gerado; exclusividade de visita e revogação de cookie de outro tenant. Leitura física antes do piloto.
- **Riscos:** PIN/token em URL, histórico da mesa exposto, QR reimpresso gerar token diferente sem intenção, captcha obrigatório em cada pedido.
- **Resultado esperado:** Mesa 14 preparada para operações verdadeiras e entrada mobile simples.

### FASE 6 — Carrinho, pedido e roteamento transacional

**Objetivo:** submeter uma única intenção e criar trabalho correto nas estações.

- **Arquivos/módulos:** `modules/orders`, `menu`, validação Zod, carrinho/sessionStorage, RPCs create_order, tickets, eventos/idempotência, testes concorrentes.
- **Funcionalidades:** quantidades/notas, preview, preço/versão esperados, criação atómica, snapshots, contador, limite de pedido, assistência por staff e retry seguro.
- **Dependências:** fase 5 e carta com estações; RPCs de idempotência/locks da secção 9.
- **Critérios de aceite:** pedido de 40,50 € gera ticket COZ e BAR corretos; preço calculado só na base; repetir key/payload devolve mesmo pedido; uma linha inválida aborta todas.
- **Testes necessários:** QA-O01–O08; teste que perde resposta após commit; 20 envios concorrentes da mesma key; pedido vs alteração de preço/disponibilidade.
- **Riscos:** double-submit, pedido parcial invisível, MAX()+1, transações divididas por requests, total em float.
- **Resultado esperado:** criação e leitura de pedido confiáveis antes de adicionar interações de KDS.

### FASE 7 — Sincronização e estados de ligação

**Objetivo:** distribuir mudanças sem tornar websocket a única fonte de verdade.

- **Arquivos/módulos:** `staff_invalidations`, publication/RLS, `lib/realtime`, QueryClient por tenant, snapshot endpoints, ConnectionBanner.
- **Funcionalidades:** eventos mínimos por destinatário, invalidação/refetch, polling staff 4 s e cliente 3 s, reconciliação ao focar/reconectar, servidor como relógio.
- **Dependências:** fase 6; Auth browser/SSR coerentes e policies testadas.
- **Critérios de aceite:** dois browsers veem o mesmo estado; tabela de pedidos não é publicada diretamente; desconexão aparece; reentrada recupera mudanças perdidas; nenhum dado sensível em payload.
- **Testes necessários:** QA-R01–R05; desligar WebSocket mantendo HTTP, interromper rede, duplicar/atrasar invalidações, suspender membro conectado, alternar tenant.
- **Riscos:** confiar em filtro JS, mensagens fora de ordem recuarem estado, múltiplas subscriptions por render, som repetido em polling.
- **Resultado esperado:** infraestrutura de atualização utilizada desde os primeiros painéis, sem remendo no final.

### FASE 8 — Cozinha e bar

**Objetivo:** produzir itens com poucos toques num monitor/tablet.

- **Arquivos/módulos:** `modules/stations`, `StationTicket`, rotas op/cozinha e op/bar, batch transitions e projeções de fila.
- **Funcionalidades:** Novo/Em preparação/Pronto; tempos e observações legíveis; transição de linha ou batch; esgotar produto da própria estação; ativar som; leitura em tablet.
- **Dependências:** fases 6–7; permissões de estação na RPC.
- **Critérios de aceite:** cozinha não recebe bebidas/preços; bar não altera comida; cada linha avança independentemente; pronto parcial aparece ao salão sem aguardar o ticket inteiro.
- **Testes necessários:** QA-K01–K04; transições inválidas, batch com uma linha antiga, ticket com uma linha pronta e outra a preparar; 1024×768 e modo compacto mobile.
- **Riscos:** usar estado agregado do Order para mover tudo; cancelar ou entregar por um papel sem competência; excesso de decoração.
- **Resultado esperado:** dois KDS funcionais do mesmo motor, com dados próprios e UI adequada.

### FASE 9 — Salão, chamados e entrega

**Objetivo:** distribuir trabalho de atendimento sem duplicar deslocações.

- **Arquivos/módulos:** `modules/service-calls`, ReadyQueue/CallQueue/TableList, op/salao, claim/resolve/reassign/pickup/deliver.
- **Funcionalidades:** motivos finitos, deduplicação por visita/tipo, assumir, concluir, reatribuir com motivo, recolher linhas prontas, entregar; resumo por mesa; pedido assistido.
- **Dependências:** fases 5–8; timestamps e version checks.
- **Critérios de aceite:** dois cliques de funcionários distintos não assumem o mesmo trabalho; cliente vê estado do chamado; bebidas podem ser entregues antes da comida; dono da tarefa visível.
- **Testes necessários:** QA-S01–S06; dois convidados criam Talheres ao mesmo tempo; novo chamado depois do anterior concluído e cooldown; recolha concorrente e reatribuição.
- **Riscos:** remover chamado da vista de todos assim que assumido, reabrir por browser fechado, múltiplas filas contraditórias.
- **Resultado esperado:** ciclo atendimento/preparo/entrega concluído e pronto para conta.

### FASE 10 — Caixa e conta

**Objetivo:** concluir o atendimento sem perder consumos ou registar dinheiro duas vezes.

- **Arquivos/módulos:** `modules/billing`, BillReview, op/caixa, RPCs request/reopen/settle/void, bill_lines/payment_records e eventos.
- **Funcionalidades:** pedido de conta deduplicado, bloqueio de novos pedidos, conferência, pendências, anulações autorizadas, recebimento integral externo e fecho da visita.
- **Dependências:** fase 9; lock comum com create_order; roles de caixa/admin.
- **Critérios de aceite:** pedido de conta não implica pagamento; settle exige linhas entregues/anuladas, versão e total atuais; um pagamento por conta; fecho revoga guest e liberta a mesa.
- **Testes necessários:** QA-B01–B08, especialmente pagamento concorrente, conta vs novo pedido, total mudado, zero e valor diferente do snapshot visto.
- **Riscos:** chamar o recibo interno de fatura, fechar com itens pendentes, aceitar total fornecido pelo cliente, editar settled.
- **Resultado esperado:** ciclo completo persistente com integridade monetária e histórico.

### FASE 11 — Backoffice funcional

**Objetivo:** permitir que o dono opere o restaurante sem editar código.

- **Arquivos/módulos:** páginas admin, menu/categorias/equipa/estações/mesas/site/media/settings, formulários e publicação; runbook de onboarding.
- **Funcionalidades:** CRUD com archive, preço/disponibilidade, ordenação, estações, QR, funcionários/papéis, configuração de serviço, conteúdo, presets e upload/derivados de imagem.
- **Dependências:** fases 2–10; identidade de owner; RPCs com validação de dependências e optimistic concurrency.
- **Critérios de aceite:** editar preço numa única fonte atualiza a carta; histórico não muda; edição concorrente não sobrescreve; produtos com uso não se apagam; admin não promove a si mesmo a owner.
- **Testes necessários:** QA-M01–M07, upload indevido/cross-tenant, draft vs published, links de menu, owner/admin constraints e reaproveitamento dos componentes operacionais.
- **Riscos:** CRUD amplo com service_role, fields extras por mass assignment, bucket público para rascunhos, listar milhares de registos sem paginação.
- **Resultado esperado:** administração completa, com lista/detalhe e estados úteis para todos os módulos previstos.

### FASE 12 — Reservas, analytics e privacidade operacional

**Objetivo:** completar os serviços públicos e a leitura básica do negócio.

- **Arquivos/módulos:** `modules/reservations`, `analytics`, dashboard, consultas SQL, conteúdo Privacidade e job de retenção.
- **Funcionalidades:** pedido de reserva, fila e contacto confirmado manualmente; métricas da secção 12 da Arquitetura; filtros até 90 dias; anonimização/TTL definidos.
- **Dependências:** históricos de fases 6–10; horário/fuso; dados de seed com timestamps reais.
- **Critérios de aceite:** não confirmar reserva automaticamente; metrics derivadas da base; 56,00 € recebidos no seed; “Sem dados” diferente de zero; dia começa às 05:00; job não apaga contas.
- **Testes necessários:** QA-N01–N05; dados cancelados, média/amostra, viragem de dia/DST, retenção de reservas sem perder contagens.
- **Riscos:** misturar valor pedido com recebido, contagens duplicadas por join, inventar notificações de reserva, tratar fuso como UTC fixo.
- **Resultado esperado:** proprietário encontra informação útil e formulários refletem o comportamento real.

### FASE 13 — Demo integral e segundo tenant

**Objetivo:** permitir demonstrar o produto imediatamente e reproduzir os testes.

- **Arquivos/módulos:** fixtures de Pátio/Balcão, seed/reset/provision, dados Home/carta/mesas/equipa e roteiro de apresentação.
- **Funcionalidades:** 24 produtos, 14 mesas, sete funcionários, duas estações, seis pedidos, contas/chamados/reservas e tenant B mínimo; seed idempotente e relógio de referência.
- **Dependências:** fases 2–12; imagens podem aguardar fase 14; dados nunca hardcoded dentro dos componentes.
- **Critérios de aceite:** executar seed duas vezes mantém contagens/totais; P07 indisponível; Mesa 14 livre; tenant B tem outras entidades e tema; nenhuma senha real no repo.
- **Testes necessários:** QA-D01–D04; totais/estados contra fixtures abaixo; reset negado em tenant real/produção; login independente por papel.
- **Riscos:** duplicar pedidos a cada dev start, datas antigas produzirem demo vazia, credenciais de demo em produção pública.
- **Resultado esperado:** roteiro de ponta a ponta que começa num estado conhecido e pode ser repetido.

### FASE 14 — Produção visual e acabamento

**Objetivo:** atingir qualidade de restaurante real e ergonomia operacional.

- **Arquivos/módulos:** `assets/visual-manifest.json`, assets individuais/variantes, ASSETS, CSS dos presets e páginas públicas.
- **Funcionalidades:** produzir os 32 assets definidos na Arquitetura, usando referências aprovadas e cinco camadas; integrar fontes locais, crops responsivos e alt; rever Home, carta, produto, mesa e KDS.
- **Dependências:** orçamento/ferramenta de geração autorizados no contexto da construção; carta e conceito finais; fase 4 e 13. Não gerar imagens nesta fase documental atual.
- **Critérios de aceite:** 24 capas correspondem aos 24 pratos/bebidas; cada imagem passa revisão; cenários/louça consistentes; nenhuma imagem contém texto/QR falso; 360 px conserva assunto e CTA.
- **Testes necessários:** todos os caminhos existem, pesos/dimensões, proveniência, contact sheet e inspeção das imagens individuais; screenshots Home/produto/mesa em desktop/mobile vistos e corrigidos.
- **Riscos:** comida plástica, referência de aparência incoerente, hotlinks, servir placeholder como fotografia final. Sem ferramenta, marcar assets pendentes e entregar código funcional sem alegar acabamento final.
- **Resultado esperado:** demo comercial com identidade própria, sem transformar a operação num exercício decorativo.

### FASE 15 — QA integrado e correções

**Objetivo:** comprovar comportamento, isolamento e qualidade de uso antes de entregar.

- **Arquivos/módulos:** suites tests, QA_REPORT, screenshots/trace relevantes; correções nos módulos efetivamente afetados.
- **Funcionalidades:** executar matriz de QA abaixo, percurso multibrowser, falhas de rede, concorrência, revisão de acessibilidade e desempenho.
- **Dependências:** fases 0–14 completas ou pendências explicitadas; não substituir QA por build verde.
- **Critérios de aceite:** nenhum bloqueador aberto; falhas de tenant/auth/dinheiro/duplicação não aceitas; evidências com versão/ambiente e resultados reais; testes de risco passaram depois da última correção relevante.
- **Testes necessários:** unit/db/integration/e2e; amostra de carga; teclado/zoom/reduced motion; revisar screenshots, consola e requests. Repetir apenas o que cobre uma alteração ou um risco ainda aberto.
- **Riscos:** escrever testes que só repetem implementação; usar apenas uma sessão; declarar realtime testado sem cortar a conexão; tomar Lighthouse como prova de operação.
- **Resultado esperado:** candidato a entrega, com limitações materiais descritas e evidência suficiente para revisão.

### FASE 16 — Preparação de deploy, staging e entrega

**Objetivo:** tornar o produto instalável e operável fora da máquina do implementador.

- **Arquivos/módulos:** configuração Vercel, migrations aplicadas por pipeline, settings Supabase, README, OPERATIONS, rollback e QA_REPORT final.
- **Funcionalidades:** ambientes isolados, domínio verificado, TLS, redirects Auth, SMTP, secrets, jobs de retenção, logs e backup/restauração; deploy de staging quando autorizado no contexto.
- **Dependências:** fase 15; acesso a serviços/contas/domínios fornecido. Esta especificação não é uma autorização para comprar serviços ou publicar agora.
- **Critérios de aceite:** build de produção executa; smoke real em staging inclui dois browsers, Auth e snapshot; não há seed demo em tenant real; restore testado; pacote pronto para entregar ao próximo agente.
- **Testes necessários:** login/callback, custom domain e host inválido, media, recuperação após refresh, pedido→conta no ambiente remoto; secret scan final e verificação de cache.
- **Riscos:** publicação com credenciais demo, SMTP inexistente, região distante, migrations incompatíveis, rollback de aplicação sobre schema destrutivo.
- **Resultado esperado:** repositório e instruções reproduzíveis; URL funcional se deploy foi autorizado/configurado. Se faltar acesso, entregar tudo localmente validado e indicar precisamente a configuração externa pendente, sem confundir isso com falha de código ou pedir decisões já tomadas.

## 4. Fixtures obrigatórias e resultados de referência

### 4.1 Relógio, IDs e reset

Usar IDs UUID determinísticos, em namespaces diferentes por tenant. `T0` é o timestamp capturado no início do seed; testes usam relógio fixo, por exemplo 2026-09-27T13:00:00Z (14:00 em Lisboa). Em demonstração ao vivo, usar hora atual do servidor para os relógios continuarem reais; não montar um timer que inventa mudanças de estado.

`paid_at` das duas contas concluídas é T0, garantindo inclusão no dia operacional de T0. Os outros timestamps são offsets coerentes anteriores. Se T0 estiver perto de 05:00, pedidos podem pertencer ao dia operacional anterior e recebimentos ao atual, comportamento correto; o teste fixo usa 14:00 para ter contagem de seis pedidos no mesmo dia.

Seed transacional idempotente por IDs conhecidos. Não repor preços/status continuamente enquanto a demo é utilizada. Reset exige ambiente não produção, tenants `is_demo=true` e confirmação explícita no comando; preserva tenants não demo. Após reset, criar novos tokens/códigos; tokens antigos não devem recuperar a visita nova por UUID reutilizado.

### 4.2 Carta, mesas e funções

Usar integralmente o Briefing: 24 produtos/5 categorias, P07 indisponível, COZ 15 min/BAR 5 min, 14 mesas e 44 lugares, sete utilizadores fictícios. Para testes SQL, criar membros e users por ferramentas Auth suportadas; não adulterar tabela Auth manualmente em produção.

Segundo tenant `balcao-do-largo`, preset `balcao-claro`: categorias Café/Padaria, estações BAR/COZ, dois cafés e dois produtos de padaria, mesas 01/02, owner independente. Pelo menos um produto e uma mesa usam os mesmos slugs/labels do tenant A; IDs diferentes. Um utilizador adicional de teste pode ser membro de A e B, com admin em A e bar em B, para provar que papéis não viajam com o utilizador.

### 4.3 Estado inicial do Pátio

| Pedido / mesa | Linhas e total | Estado inicial e tempos relativos |
|---|---|---|
| O001 / 08 | P10×2=3000, P11×1=450, P19×2=600; **4050** | submitted T0−18 min; comida preparing desde −10 min; bebida ready desde −15 min, iniciada −17 min |
| O002 / 04 | P06×1=2200, P18×1=400; **2600** | submitted −35; preparação inicia −33; P06 ready −20, P18 ready −31; linhas delivered |
| O003 / 12 | P08×2=3200, P17×1=250; **3450** | submitted −30; preparação inicia −28; P08 ready −16, P17 ready −27; linhas delivered; conta requested −1 |
| O004 / 07 | P06×1=2200, P21×1=500; **2700** | submitted −28; preparação inicia −26; P06 ready −13, P21 ready −25; linhas delivered |
| O005 / 02 | P10×2=3000, P19×2=600; **3600** | submitted −45; preparação inicia −43; P10 ready −30, P19 ready −41; linhas delivered; received T0 via external_card; visita closed |
| O006 / 03 | P08×1=1600, P18×1=400; **2000** | submitted −40; preparação inicia −38; P08 ready −26, P18 ready −37; linhas delivered; received T0 via cash; visita closed |

Para todas as linhas delivered, atribuir picked_up_at = ready_at + 30 s e delivered_at = picked_up_at + 60 s. Os valores de preparação acima são a referência de analytics; não mudar ready_at para “arrumar” as métricas. Isso permite validar entrega parcial e duração por linha sem timestamps contraditórios.

Criar eventos de todas as transições, membros válidos e snapshots monetários no fecho. Não inserir só estado final sem timestamps/histórico. Mesas 02/03 ficam livres após fecho. 04/07/08 open, 12 billing, restantes livres. Mesa 14 sem visitas ativas.

Chamados iniciais: Talheres na 04 criado T0−2 min, status new; ajuda na 07 criado T0−4, assumido por Rui T0−3, status claimed; bill na 12 criado T0−1, new. As contas 02/03 podem ter históricos de chamados concluídos, mas não criar chamados extra na fixture de métricas mínimas. Dois pedidos de reserva para o próximo dia de abertura posterior a hoje, às 13:00 e 13:30: um pending e um confirmed com contacted_at, contactos `.example` e nomes “Cliente Demo A/B”. No relógio fixo de domingo 27/09/2026, usar terça-feira 29/09/2026, pois segunda está encerrada.

### 4.4 Asserções iniciais, relógio fixo 14:00

| Medida | Resultado esperado |
|---|---:|
| Orders | 6 |
| Linhas | 13 |
| Unidades pedidas | 18 |
| Visitas ativas | 4 |
| Mesas livres | 10 |
| Contas requested | 1 |
| Recebimentos do dia | **5600 cêntimos** |
| Recebimento external_card | 3600 |
| Recebimento cash | 2000 |
| Total de consumos ainda abertos | 12800 cêntimos |
| Chamados ativos | 3 (2 new, 1 claimed) |
| Espera média de primeira assunção, n=1 | 60 segundos |
| Preparação média COZ, n=5 linhas concluídas | 756 segundos (12,6 min) |
| Preparação média BAR, n=6 linhas concluídas | 90 segundos (1,5 min) |
| Linhas atrasadas em preparação | 2, ambas da Mesa 08 |
| Prontos aguardando recolha | 1 linha, 2 unidades de P19 |

Total aberto: 4050+2600+3450+2700=12800. Somar contas pagas novamente seria erro. A linha de duas unidades conta uma vez na média de preparação, conforme a definição da Arquitetura.

## 5. Matriz mínima de QA

Executar contra uma base de dados real de teste. Não substituir testes de isolamento por mocks dos repositórios. Testes de browser usam contextos separados para cliente, salão, cozinha, bar e caixa.

### 5.1 Autenticação, RBAC e tenants

| ID | Teste | Aceite |
|---|---|---|
| QA-A01 | Login válido/inválido, refresh, logout e recuperação local | Identidade verificada; erro neutro; logout limpa estado e sessão; recuperação efetivamente recebida no coletor local |
| QA-A02 | Cozinha chama endpoint/RPC de editar preço, listar pagamentos e alterar roles | 403/negação; nenhum dado sensível no payload |
| QA-A03 | Suspender membro com página/socket abertos | Próxima query/mutação negada; sem novas invalidações visíveis autorizadas; limpar interface privada |
| QA-A04 | Admin tenta remover owner, promover-se ou aceitar convite alheio | Negado; owner ativo preservado; só email autenticado correto aceita |
| QA-T01 | JWT de A lê/escreve entidades B por UUID | 404/negação, sem diferença que exponha dados de B |
| QA-T02 | Inserir item de B num pedido/visita de A e ligar media B a A | RPC rejeita; FK composta também rejeita inserção indevida com papel de teste apropriado |
| QA-T03 | `anon`/`authenticated` acedem schema privado e funções não concedidas | Grants bloqueiam; guest RPC indisponível sem server role |
| QA-T04 | Alterar filtros do canal realtime e selecionar invalidações de outro membro | Nenhuma linha alheia, incluindo outro membro do mesmo tenant |
| QA-T05 | Utilizador admin A/bar B alterna tenant e cache | Papéis e dados mudam corretamente; bar B não herda admin A |

### 5.2 QR, sessão e pedidos

| ID | Teste | Aceite |
|---|---|---|
| QA-Q01 | QR válido, inválido, revogado, mesa desativada e acesso só por label | Só válido oferece join; nenhum caso dá acesso a histórico |
| QA-Q02 | Copiar QR sem código e fazer POST direto de pedido | Negado; carta continua pública |
| QA-Q03 | Código errado/repetido/expirado, limite por IP/contexto | Falhas controladas e 429; nenhuma sessão criada indevidamente |
| QA-Q04 | Dois dispositivos com QR+código, refresh e separador novo | Sessões distintas, mesma visita/conta; carrinhos próprios |
| QA-Q05 | Fechar visita e abrir nova na mesma mesa | Cookies/código antigos falham; conta anterior inacessível |
| QA-Q06 | Abrir atendimento duas vezes em paralelo | Uma única visita ativa e uma única conta |
| QA-Q07 | QR impresso e reimpresso, rotacionado depois | URL original preservada na reimpressão; antiga revogada após rotação; sem token em logs/referrer |
| QA-O01 | Enviar 2 hambúrgueres, batata, 2 colas | Total 4050; COZ recebe P10/P11 e BAR P19; snapshots corretos |
| QA-O02 | Adulterar preço, total, stationId ou restaurantId | Campos indevidos recusados/ignorados com schema estrito; servidor não cobra valor adulterado |
| QA-O03 | Duplo clique e 20 requests com mesma key/payload | Um Order, uma série de linhas/tickets, resultado repetível |
| QA-O04 | Mesma key com payload diferente | 409 IDEMPOTENCY_CONFLICT; original intacto |
| QA-O05 | Perder resposta após commit e repetir | Resultado original recuperado; nenhuma segunda cobrança/pedido |
| QA-O06 | Dois clientes enviam pedidos iguais com keys diferentes | Dois pedidos legítimos, ambos na mesma conta |
| QA-O07 | Produto esgota/muda preço enquanto no carrinho | Pedido inteiro aborta com detalhe; carrinho preservado; reconfirmação explícita |
| QA-O08 | Trocar estação/preço após envio | Pedido anterior mantém estação/preço; próximo usa cadastro atualizado |

### 5.3 Realtime, cozinha e salão

| ID | Teste | Aceite |
|---|---|---|
| QA-R01 | Pedido de um browser aparece em outros | Meta p95 ≤2 s em ligação saudável, medida entre commit e apresentação |
| QA-R02 | WebSocket desligado, HTTP funcional | Polling recupera mudanças com meta ≤5 s; interface informa modo degradado quando detetado |
| QA-R03 | Internet offline, ação/reconexão | Sem sucesso falso ou fila offline; snapshot antes de reativar ação |
| QA-R04 | Eventos duplicados/atrasados; perder evento durante subscription | Revision não recua; refetch e reconciliação recuperam verdade |
| QA-R05 | Reload e 10 entradas/saídas do mesmo painel | Uma subscription por escopo ativo; sem listeners/som duplicados |
| QA-K01 | Cozinha altera Novo→Preparando→Pronto e tenta pular/voltar | Caminho válido grava timestamps; inválidos falham |
| QA-K02 | Bar tenta alterar linha da cozinha por RPC | Negado; sem alteração parcial |
| QA-K03 | Uma linha fica pronta antes de outra no mesmo ticket | Salão recebe linha pronta; ticket preserva pendências |
| QA-K04 | Batch com versão antiga em uma linha | Batch inteiro aborta; UI recarrega sem sucesso parcial |
| QA-S01 | Dois funcionários assumem mesmo chamado | Um responsável; segundo recebe conflito com atualização |
| QA-S02 | Dois clientes chamam Talheres simultaneamente | Um chamado ativo; ambos veem esse chamado |
| QA-S03 | Concluir chamado e voltar a pedir depois do cooldown | Novo chamado; não reabrir anterior |
| QA-S04 | Dois funcionários recolhem mesma linha pronta | Uma recolha; responsável único |
| QA-S05 | Entregar bebidas antes de comida | Bebidas delivered; pedido parcialmente servido; comida continua em preparação |
| QA-S06 | Reatribuir tarefa a membro suspenso/outra função/tenant | Negado; reatribuição válida exige motivo e evento |

### 5.4 Conta, administração e métricas

| ID | Teste | Aceite |
|---|---|---|
| QA-B01 | Pedir conta em dois dispositivos | Uma transição, um chamado bill ativo e novos pedidos bloqueados |
| QA-B02 | Pedir conta com prato por entregar e tentar settle | Pedido de conta funciona; settle devolve PENDING_ITEMS |
| QA-B03 | Novo pedido concorre com bill-request | Ordem serial válida: ou pedido entra antes e conta inclui-o, ou pedido falha com visita billing |
| QA-B04 | Dois caixas registam recebimento, keys iguais/diferentes | Um payment_record; um fecho; nunca dois recebimentos |
| QA-B05 | Anular linha depois de caixa carregar total, antes de settle | VERSION_CONFLICT/total alterado; exigir conferência atualizada |
| QA-B06 | Tentar fechar com total adulterado/método inválido ou função salão | Negado; nenhuma mutação financeira |
| QA-B07 | Mesa sem consumo ou todas as linhas anuladas | Void com motivo, zero payment_records, mesa livre |
| QA-B08 | Editar/reabrir/anular linha de conta settled | Negado; snapshots e pagamento imutáveis |
| QA-M01 | Alterar preço, disponibilidade e estação com um pedido existente | Site/novos pedidos atualizados; histórico preservado |
| QA-M02 | Dois admins editam a mesma versão do produto | Segundo recebe conflito; nenhuma sobrescrita silenciosa |
| QA-M03 | Ocultar categoria/arquivar produto destacado | Sem novos envios; destaque omitido com aviso admin; histórico acessível |
| QA-M04 | Desativar estação com tickets ativos ou mesa ocupada | Rejeitado com dependência concreta; não perder trabalho |
| QA-M05 | Draft, preview e publish; mudança de preset | Público só muda após publish; três presets mantêm todas as ações |
| QA-M06 | Upload executável, MIME falso, arquivo grande, SVG ativo ou mídia de B | Rejeitado; originais privados; referência estrangeira impossível |
| QA-M07 | Convite/suspensão/role por admin e owner | Permissões do documento respeitadas, sem autoelevação ou remoção do owner |
| QA-N01 | Métricas contra seed fixo | Seis pedidos, 5600 recebidos, três chamados ativos; formulas sem duplo join |
| QA-N02 | Preparação, itens anulados e nenhuma amostra | Durações corretas, anulados excluídos e “Sem dados”, sem NaN/zero inventado |
| QA-N03 | 04:59/05:00 local e mudanças de hora | Dia operacional e intervalo UTC corretos; hora não escolhida é rejeitada quando inválida |
| QA-N04 | Reserva fora do horário, data antiga, sem contacto e duplicação de envio | Erros claros; validação de janela; idempotência evita pedido repetido |
| QA-N05 | Confirmar reserva e executar retenção com relógio avançado | Confirmar exige contacto; anonimizar sem apagar métricas nem contas |
| QA-D01 | Seed duas vezes | Mesmas entidades e totais, sem duplicação |
| QA-D02 | Reset em produção/tenant não demo | Negado, sem alterações |
| QA-D03 | Reabrir demo depois de reset com cookie antigo | Negado; segredos novos, apesar de IDs determinísticos |
| QA-D04 | Trocar para Balcão do Largo e voltar | Menu, marca, mesa, papéis e dados de A/B não se misturam |

### 5.5 Navegador, mobile, erros e capacidade

| ID | Teste | Aceite |
|---|---|---|
| QA-U01 | Todas as rotas, URLs diretas, reload, back/forward, 404/403 | Sem página em branco, redirect infinito ou fallback indevido para Home |
| QA-U02 | 360×800, 390×844, 768×1024, 1024×768, 1440×900 e 320 px estreito | Sem overflow da página; preço/CTA acessíveis; KDS adapta colunas |
| QA-U03 | Uma mão na mesa e salão; teclado, zoom 200%, safe area | Alvos adequados, foco visível, modais fecham/devolvem foco, barras não tapam conteúdo |
| QA-U04 | Conexão lenta, erro 500, timeout, 429, expirado, sem resultados | Mensagem específica, retry seguro e estado preservado; nenhum falso sucesso |
| QA-U05 | Sem pedidos/chamados/contas, carta vazia e produto sem imagem | Estados vazios úteis; CTA pertinente; layout não quebra; ausência de imagem não inventa fotografia |
| QA-U06 | Reduced motion, som bloqueado e cor sem distinção | Estado continua compreensível; animações desativadas; nenhum fluxo depende de som/cor |
| QA-U07 | Assets/crops e screenshots vistos | Pratos correspondem à carta; sem defeitos visuais/material repetido indevidamente |
| QA-U08 | 20 operadores + 50 convidados, 50 envios em mesas distintas | Sem duplicações/perda de updates; p95 e erros medidos; sem limite por visita falsear cenário |
| QA-U09 | Chrome Android/Safari iOS quando dispositivos disponíveis; Chromium automatizado | Cookie, câmara/QR externo, teclado, viewport e sticky funcionam; limitações de dispositivo reportadas |
| QA-U10 | Build produção, consola, requests, bundle e imagens | Sem secrets, erros inesperados, 404 de assets ou carregamento de toda galeria na primeira dobra |

Para QA-U08, usar um tenant de carga separado com 50 mesas e limites configurados para o ensaio, preservando as 14 mesas do demo. O teste de carga não altera o limite de 30 mesas do envelope comercial inicial; serve para stress. Respeitar quotas por sessão/visita e reportar qualquer ajuste usado. Não pressionar produção de um cliente.

## 6. Roteiro de demonstração e aceite integrado

Duração sugerida para apresentação, não SLA de execução: 10–15 minutos.

1. Abrir Home do Pátio no mobile. Mostrar prato assinatura, carta/preços, ambiente e reserva pendente. Alternar para Balcão para provar mudança de identidade, depois voltar.
2. Como Rui, abrir atendimento da Mesa 14 e obter código. Abrir QR no smartphone/contexto de cliente e entrar. Mostrar que a marca se mantém.
3. Adicionar P10×2, P11×1 e P19×2. Confirmar total **40,50 €** e enviar. Recarregar a página para provar persistência.
4. Em janelas de Inês/Tomás, mostrar o ticket separado. Bar inicia/termina bebidas; cozinha inicia comida.
5. Salão recebe duas colas prontas. “Vou levar” → “Entregue”. Cliente vê bebidas entregues e comida ainda em preparação.
6. Outro cliente entra na mesma mesa e pede talheres. Rui e Sara tentam assumir; só um fica responsável. Concluir.
7. Cozinha marca restantes linhas prontas; salão recolhe/entrega. Cliente consulta conta partilhada de 40,50 €.
8. Cliente pede conta. Caixa confere e regista pagamento por terminal externo. Mesa volta a livre; cookie antigo já não serve para pedir.
9. Demonstrar edição do preço de P10 para 16,00 €: carta muda, conta anterior permanece 40,50 €. Restaurar preço somente pelo reset deliberado da demo ou edição explícita.
10. Mostrar analytics e histórico com os eventos realizados. Se demonstração partiu do seed, recebimentos passam de **56,00 € para 96,50 €**, desde que o fecho ocorra no mesmo dia operacional.

Desligar WebSocket durante uma atualização separada para mostrar recuperação via polling. Não interromper a demonstração de conta com um caos de testes; a prova de falhas é executada na suite e pode ser apresentada depois.

## 7. Gates de conclusão e riscos materiais

| Gate | Deve estar verde antes de… | Impedimentos que bloqueiam |
|---|---|---|
| G1 Segurança | Desenvolver sobre dados privados reais | Falha de isolamento, role errada, RPC sem guard, secret exposto |
| G2 Transações | Declarar pedidos utilizáveis | Duplicação, preços manipuláveis, estado parcial, corrida de conta |
| G3 Operação | Iniciar piloto | KDS sem dados próprios, entrega sem responsável, offline com falso sucesso |
| G4 Produto completo | Declarar V1 funcional | Rotas faltantes, CRUD falso, login/recuperação impossível, conta só visual |
| G5 Apresentação | Declarar demo comercial final | Assets trocados/placeholder, mobile quebrado, fotografia com defeitos |
| G6 Ambiente | Declarar produção pronta | Secrets/configuração/SMTP/domínio/backup não verificados |

Se um serviço externo não estiver acessível, continuar todo o trabalho local autorizado e possível, registar a dependência exata e entregar o resultado concreto. Não encobrir bloqueio com screenshots ou dados simulados. Não há obrigação de reabrir decisões de arquitetura por falta temporária de credencial.

Correções financeiras, fallback para serviço manual e limites do QR devem constar do runbook. Um sistema que guarda uma conta não substitui o processo de faturação do restaurante. Não escrever promessas de conformidade/escala que os testes e o contrato não sustentem.

## 8. Checklist final de entrega

### Produto e UX

- [ ] Todas as páginas públicas existem, com marca e conteúdo do restaurante.
- [ ] 24 produtos, categorias, preços, alergénios e disponibilidade coerentes.
- [ ] Mesa, carrinho, acompanhamento, chamados e conta funcionam no smartphone.
- [ ] QR + código de atendimento, refresh, vários convidados e fecho implementados.
- [ ] Pedido assistido usa o mesmo motor de pedido do cliente.
- [ ] Cozinha/bar separados por estação e com ações legíveis em tablet.
- [ ] Salão assume chamados/recolhas sem duplicar trabalho.
- [ ] Caixa regista um recebimento integral e fecha a visita de forma atómica.
- [ ] Backoffice permite gerir todos os recursos previstos sem editar código.
- [ ] Reservas têm confirmação humana explícita e nenhuma notificação fictícia.
- [ ] Analytics têm fórmulas, períodos e valores derivados da base.

### Integridade e segurança

- [ ] Dados privados fora da API direta; grants/RLS/EXECUTE testados.
- [ ] Autorização no endpoint e na RPC; service_role não usada como atalho de staff.
- [ ] FKs compostas e queries impedem mistura de tenant.
- [ ] Cozinha/bar não recebem preços, contactos nem dados da outra estação.
- [ ] Owner/admin/membros respeitam limites de criação, suspensão e titularidade.
- [ ] Idempotência e concorrência validadas em múltiplas requisições reais.
- [ ] Snapshots preservam nome/preço/estação e histórico financeiro.
- [ ] Conta pedida bloqueia novos pedidos; settle valida pendências/versão/total.
- [ ] QR antigo, código expirado e sessão de visita fechada não autorizam ações.
- [ ] Tokens, PINs, cookies e PII ausentes de logs, URLs persistidas e realtime.
- [ ] Uploads validados e ownership de media protegido.
- [ ] Sem segredos no Git, bundle, `.env.example` ou dados públicos.

### Qualidade visual e dispositivos

- [ ] 32 imagens-mãe e variantes aprovadas, ou pendências explicitadas sem alegar acabamento final.
- [ ] Imagens de produtos representam exatamente a carta demo.
- [ ] Home vende o restaurante, sem linguagem visual de plataforma SaaS.
- [ ] Três presets mudam composição/identidade sem alterar o core.
- [ ] Smartphone, tablet, desktop, teclado, zoom e safe areas revistos.
- [ ] Estados vazios, erros, rede lenta e offline compreensíveis.
- [ ] Assets locais/Storage válidos, sem 404, fontes remotas imprevistas ou hotlinks.
- [ ] Screenshots foram inspecionados, não apenas gerados.

### Engenharia, operação e handoff

- [ ] Instalação a partir de checkout limpo e build de produção verificadas.
- [ ] Migrations, tipos gerados e funções SQL versionados.
- [ ] Seed repetível, reset protegido, tenant B e credenciais locais documentados.
- [ ] Suites críticas executadas e resultados verdadeiros no QA_REPORT.
- [ ] Roteiro Mesa 14 concluído com várias funções/dispositivos.
- [ ] Realtime e fallback medidos; reconexão não perde estado.
- [ ] Domínio/SMTP/Auth/retenção/backup configurados ou dependências externas enumeradas.
- [ ] Nenhum upload/publicação/serviço pago feito sem autorização aplicável.
- [ ] README, ASSETS, OPERATIONS, DECISIONS e limitações entregues.
- [ ] Nenhuma funcionalidade fora do escopo foi adicionada para substituir uma parte inacabada.

## 9. Formato do relatório final da construção

O agente implementador deve entregar: onde está o repositório; como executar; como entrar em cada função no ambiente demo; quais testes passaram; quais imagens e páginas foram revistas; URL de staging se existente; limitações e configurações externas pendentes. Diferenciar “implementado”, “testado localmente”, “testado em staging” e “dependente de configuração”.

Não terminar dizendo apenas que a estrutura está pronta ou pedindo permissão para continuar o trabalho já solicitado. O alvo é a V1 completa definida neste pacote, com uma entrega concreta e revisável.
