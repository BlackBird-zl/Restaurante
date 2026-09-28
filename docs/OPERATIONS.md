# Operação — runbook

Público: operador da plataforma (quem gere Vercel/Supabase) e administradores de restaurante.
Tudo o que aqui está marcado **[não executado]** está escrito a partir do código e da configuração, mas não foi
corrido contra serviços remotos nesta construção.

## 1. Ambientes

| | Local | Staging / Produção |
|---|---|---|
| App | `pnpm dev` ou `pnpm build && pnpm start` | Vercel (`vercel.json`, região `cdg1`) |
| Base de dados/Auth/Storage | `supabase start` ou `pnpm local:up` | Projeto Supabase (UE) |
| Email | Mailpit (`:54324`) | SMTP próprio configurado no Supabase Auth |
| Realtime | indisponível na stack sem Docker (polling) | Supabase Realtime (publicação `supabase_realtime` só com `staff_invalidations`) |

Variáveis: `.env.example`. Em produção: `APP_ENV=production`, `APP_URL_SCHEME=https`, `APP_PREVIEW_HOSTS` vazio,
`APP_PUBLIC_PORT` vazio, e segredos gerados com `openssl rand -base64 32` guardados só no gestor de segredos da Vercel.
`DEMO_SEED_PASSWORD` nunca é definida em produção.

## 2. Primeiro deploy **[não executado]**

1. Criar projeto Supabase; em *Auth*: desativar sign‑ups públicos, configurar SMTP, `Site URL = https://<staff host>`,
   redirect `https://<staff host>/auth/callback`.
2. Aplicar migrations: `SUPABASE_DB_URL=<connection string> pnpm db:migrate` (ou `supabase link && supabase db push`).
3. Storage: criar `restaurant-media-public` (público, 10 MB, `image/webp,image/jpeg,image/png,image/avif`) e
   `restaurant-media-private` (privado).
4. Realtime: confirmar que a publicação `supabase_realtime` contém `public.staff_invalidations`.
5. DNS: `*.APP_BASE_DOMAIN` e o host do staff apontados para a Vercel; adicionar ambos (wildcard) ao projeto Vercel.
6. Vercel: variáveis de ambiente de produção; deploy do `main`.
7. Job diário de retenção: ativar `.github/workflows/retention.yml` com os segredos `NEXT_PUBLIC_SUPABASE_URL` e
   `SUPABASE_SERVICE_ROLE_KEY` no ambiente `production`.
8. Verificação: `/entrar` no host do staff, `https://<slug>.<base>/` de um tenant, recuperação de palavra‑passe recebida.

## 3. Criar um restaurante

```bash
pnpm provision:tenant --slug=tasca-azul --name="Tasca Azul" --owner-email=dona@tasca.pt \
  --owner-name="Ana" --preset=casa-editorial --tables=12 [--invite]
```

- Transação única: restaurante, owner (admin), domínio de plataforma `tasca-azul.<APP_BASE_DOMAIN>`, estações COZ/BAR,
  mesas com QR, tema, páginas em rascunho. Pedidos nascem **em pausa**.
- Sem `--invite`, a conta é criada sem palavra‑passe e a dona usa "Recuperar palavra‑passe" no host do staff.
  Com `--invite`, o Supabase envia o convite (requer SMTP).
- Repetir com o mesmo slug não altera nada. Testado localmente (tenant `tasca-teste`).

Depois, no admin do restaurante: Carta (categorias, produtos, preços, estações, alergénios) → Site e marca
(escrever e publicar páginas; a Home exige três destaques) → Mesas e QR (imprimir) → Equipa (convites) →
Configurações (horário, contactos) → abrir pedidos.

## 4. Domínio próprio **[não executado]**

1. O cliente cria `CNAME www.cliente.pt → cname.vercel-dns.com` (ou A no apex).
2. O operador adiciona o domínio ao projeto Vercel e aguarda o certificado.
3. Registo na base (operador, SQL):
   ```sql
   insert into app_private.restaurant_domains(restaurant_id, hostname, kind, status, verified_at, is_primary)
   values ('<restaurant id>', 'www.cliente.pt', 'custom', 'active', now(), false);
   -- para torná-lo primário (aliases passam a redirecionar 308):
   update app_private.restaurant_domains set is_primary = (hostname = 'www.cliente.pt') where restaurant_id = '<id>';
   ```
4. Os QR impressos contêm o host primário: depois de mudar o primário, reimprimir QR (o token mantém‑se).
   O proxy mantém em cache a resolução de host por até 30 s.

## 5. Equipa

- Admin → Equipa → Convidar (email, nome, funções, estações). Com SMTP configurado o Supabase envia o convite;
  se a conta já existir, a pessoa entra e aceita em `/restaurantes`. A resposta indica a verdade
  (`invited`, `existing_account`, `email_failed`).
- Suspender termina o acesso na próxima query/mutação e remove a pessoa das invalidações.
- Só o owner transfere a titularidade ou promove a admin. O owner não pode ser suspenso/removido.

## 6. QR das mesas

- **Imprimir/reimprimir**: Admin → Mesas e QR → Imprimir (cartão por mesa ou folha com todas as mesas). Reimprimir mantém o URL.
- **Rodar** (QR fotografado/partilhado): Admin → Mesas e QR → Rotacionar QR, confirmando o impacto. O QR antigo passa a
  "QR revogado"; opcionalmente termina as sessões dos telemóveis da visita atual. Reimprimir a seguir.
- O token do QR identifica a mesa, não autoriza pedidos: é sempre preciso o código de 6 dígitos dado pela equipa.
- Rotação da chave de cifra dos QR: definir `QR_ENCRYPTION_KEY_PREVIOUS(_VERSION)` com a chave antiga, nova chave
  em `QR_ENCRYPTION_KEY` com versão +1, deploy, e rodar os QR das mesas; depois remover a anterior.

## 7. Serviço sem sistema (fallback manual)

Se a aplicação ou a rede falharem durante o serviço: pausar pedidos (Admin → Configurações → Pausado, se acessível),
anunciar às mesas que a equipa anota os pedidos, usar papel; quando voltar, lançar **pedido assistido** no salão
para cada mesa e fechar contas normalmente. Nada é enfileirado offline nos telemóveis — um pedido só existe quando
aparece "Pedido recebido".

## 8. Correções financeiras

- Anular linha antes do fecho: salão/admin, com motivo (fica em `domain_events`).
- Conta pedida por engano: Caixa → Reabrir conta (motivo). Mesa sem consumo: Fechar sem consumo (void com motivo).
- **Conta fechada é imutável** (triggers impedem editar `payment_records`, `bill_lines` e contas `settled/void`).
  Um erro de registo corrige‑se no sistema de faturação/caixa do restaurante e anota‑se fora da aplicação;
  a V1 não tem estornos. Este registo não é faturação fiscal.

## 9. Backup, restauro e rollback **[não executado]**

- Backups: diários automáticos do Supabase (plano Pro com PITR recomendado para produção). Antes de cada migration:
  `pg_dump --schema=app_private --schema=public --data-only` guardado fora do projeto.
- Restauro: restaurar o backup/PITR num projeto novo, apontar a Vercel para ele, validar `/entrar` e um site.
- Rollback de aplicação: *Instant Rollback* da Vercel para o deploy anterior (as migrations são aditivas).
- Rollback de migration: escrever uma migration nova que reverte (nunca editar migrations aplicadas).

## 10. Retenção e privacidade

`pnpm retention:run` (diário): chaves de idempotência expiradas, contadores de rate limit, invalidações > 24 h,
segredos de sessões de convidado 7 dias após expirar, dados pessoais de reservas 90 dias após a data (mantém
contagens). Pagamentos e contas nunca são apagados. IPs nunca são guardados em claro (hash diário com sal).

## 11. Demo

`pnpm reset:demo --confirm=reset-demo` repõe Pátio e Balcão (recusa produção e tenants reais). Utilizadores e
palavras‑passe: README. Após reset, reimprimir QR da demo.
