# Restaurant OS — template local

Template multi-page de restaurante, preparado para demonstração e personalização **sem Supabase, base de dados ou variáveis de ambiente obrigatórias**.

## Executar

Requisitos: Node 22.x e pnpm 10.

```bash
pnpm install
pnpm dev
```

Abra `http://localhost:3000`.

## Deploy Vercel

Importe o repositório na Vercel e faça deploy. Não é necessário criar projeto Supabase nem configurar chaves para o site público.

A URL raiz mostra **Pátio do Ferro**. O segundo preset pode ser visto em:

- `/demo/balcao-do-largo`
- `/d/balcao-do-largo` (compatibilidade com a antiga preview)

## O que funciona sem backend

- Home editorial
- Carta, categorias e fichas de produto
- Sobre, ambiente, contactos e privacidade
- Formulário de reserva em modo demonstração (não persiste nem envia dados)
- Contexto de mesa em modo consulta/read-only
- Dois restaurantes/presets com dados locais isolados
- 32 slots de fotografia preenchidos com fotografia real licenciada (Pexels)

## O que foi deliberadamente desacoplado

Auth, persistência transacional, realtime, RLS/RPCs, KDS operacional e backoffice persistente pertencem à versão com backend. O código histórico de backend permanece no repositório como referência de evolução, mas **não é necessário para abrir, navegar ou publicar o template público**.

## Dados

Os conteúdos ficam em:

- `fixtures/patio-do-ferro/data.ts`
- `fixtures/balcao-do-largo/data.ts`
- `fixtures/patio-do-ferro/visual-assets.ts`
- `src/data/local-template.ts`

Isso permite trocar marca, carta, preços, horários e conteúdo sem depender de um serviço externo.
