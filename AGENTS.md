<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# restaurant-os — notes for coding agents

Read `docs/RESTAURANTE_SAAS_V1_Briefing.md`, `docs/RESTAURANTE_SAAS_V1_Arquitetura_Produto.md` and
`docs/RESTAURANTE_SAAS_V1_Plano_Execucao_Claude.md` before changing behaviour. Business rules live in
SQL RPCs (`supabase/migrations`); TypeScript mirrors validation for UX only. Never import
`src/lib/supabase/privileged.ts` from client components. Decisions: `docs/DECISIONS.md`.
