# Assets visuais

## Estado: 0 de 32 fotografias produzidas — todas pendentes

Durante a construção tentou-se gerar as imagens com a única ferramenta de imagem disponível (integração Gamma);
a conta não tinha créditos (plano gratuito, 0 créditos), por isso **nenhuma fotografia foi gerada, comprada ou
obtida**. Não foram usados hotlinks, bancos de imagens nem a mesma fotografia para produtos diferentes.

Em vez disso, cada um dos 32 espaços tem um **placeholder interno**:

- SVG sem texto nem fotografia (pictograma de linha sobre fundo neutro), gerado por `scripts/lib/placeholders.ts`
  (`pnpm assets:build`) em `public/demo-assets/patio-do-ferro/NN-slug.placeholder.svg`;
- registado na base como `media_assets.source_type = 'placeholder'`;
- sempre apresentado com a etiqueta visível **"Fotografia pendente · placeholder"** (miniaturas: "Foto pendente")
  e com texto alternativo iniciado por "Fotografia pendente (placeholder interno)";
- listado no admin (Site e marca → Media e Produtos) como "placeholder · foto pendente".

A fase visual do Plano (Fase 14 / gate G5 "Apresentação") **não está concluída**.

## Manifesto

`assets/visual-manifest.json` é a fonte de verdade: para cada espaço tem id, slug, produto associado (P01–P24),
proporção, finalidade, texto alternativo final, variantes previstas, **prompt de produção e comandos** (ex.:
`/photoreal /notext /nobrandmarks /nopeople /noextraproducts`), estado e campos de aprovação.

| Espaços | Tipo | Proporção | Uso |
|---|---|---|---|
| 01–08 | Editorial (hero brasa, sala, pátio, passe da cozinha, serviço, mesa de partilha, café ao balcão, bar) | 16:9, 4:5, 1:1 | Home, Sobre, Ambiente |
| 09–32 | Um por produto P01–P24 (pão da casa … cappuccino) | 4:5 | Carta, destaques, mesa |

Cada produto tem a sua própria imagem prevista; nenhum espaço é reutilizado para outro produto.

## Como substituir por fotografias reais

1. Produzir/licenciar cada imagem de acordo com o prompt e o alt do manifesto (fotografia do prato real servido
   é preferível a imagem gerada).
2. Admin → Site e marca → Media → Carregar (JPEG/PNG/WebP/AVIF ≤ 10 MB, mín. 400×300). O servidor verifica a
   assinatura do ficheiro, remove EXIF/GPS e gera variantes WebP/JPEG (1600/800/320 px; hero 2400 e 1080×1350).
   O original não é guardado.
3. Rever o texto alternativo e **Aprovar**. Só imagens aprovadas podem ser publicadas.
4. Produtos → produto → Capa; Site e marca → escolher as imagens das páginas → Publicar.
5. Atualizar o manifesto (`status`, `source`, `license`, `approval`) e esta página.

O pipeline de upload foi testado localmente com uma imagem sintética (`scripts/qa/admin-flow.mjs`): aceite,
variantes servidas pelo Storage local sem EXIF, SVG disfarçado de JPEG rejeitado, membro da cozinha recebe 403.

## Outros recursos

| Recurso | Origem | Licença |
|---|---|---|
| Newsreader (woff2) | Production Type / Google Fonts, vendorizada em `public/fonts` | SIL OFL 1.1 (`public/fonts/*OFL*`) |
| IBM Plex Sans (woff2) | IBM, vendorizada em `public/fonts` | SIL OFL 1.1 |
| Wordmark e ícones | SVG escritos à mão no código (`Wordmark.tsx`, `Icon.tsx`) | Próprio |
| QR das mesas | Gerados em runtime pela biblioteca `qrcode` | — |

## Media pass — fotografia real licenciada (28/09/2026)

Para o modo template, os 32 slots do Pátio do Ferro foram preenchidos com **fotografia real do Pexels**, em vez de imagens geradas por IA. A seleção seguiu a Biblioteca de Comandos Visuais V2.1 como direção de curadoria: protagonista concreto, luz plausível, enquadramento legível, acabamento fotográfico natural e ausência de texto/branding falso.

- Fonte: Pexels (fotografia real licenciada para uso gratuito segundo a licença do fornecedor).
- Entrega: URLs CDN responsivas, com `w=1600`, `w=900` e `w=420` conforme o uso.
- Proveniência: cada ID e URL fonte está registado em `assets/visual-manifest.json`.
- Os ficheiros `.placeholder.svg` foram preservados apenas como fallback de desenvolvimento e já não são usados no modo template.
- A fotografia de cada produto é distinta; não há reutilização da mesma capa entre SKUs.
- O backend Supabase continua capaz de substituir estes assets por upload próprio quando o template evoluir para produção de um restaurante real.

### Nota de direção visual

A Biblioteca Visual V2.1 recomenda a arquitetura de cinco camadas — BASE, cena/luz, câmara, acabamento e saída/restrições — e, para Food & Bebidas, privilegia sequências como `/foodhero + /windowlight + /closecrop + /photoreal` ou composição editorial equivalente. Nesta versão, essas regras foram usadas como **critério de curadoria** de fotografia real: luz de janela/practical warm, profundidade de campo plausível, texturas não plásticas, ausência de HDR agressivo, escala realista e enquadramentos próprios de restaurante/hospitalidade.
