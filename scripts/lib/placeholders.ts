/**
 * Generates INTERNAL, clearly-labelled placeholders for the 32 planned photographs.
 * They are line pictograms on paper tones with the text "FOTOGRAFIA PENDENTE",
 * the production id and the product — never presented as photography.
 */
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { visualAssets, R0, type VisualAsset } from '../../fixtures/patio-do-ferro/visual-assets';

const DIMS: Record<VisualAsset['ratio'], [number, number]> = { '16:9': [1600, 900], '4:5': [1200, 1500], '1:1': [1200, 1200] };

function pictogram(kind: VisualAsset['pictogram'], cx: number, cy: number, s: number): string {
  const st = `fill="none" stroke="#252820" stroke-opacity="0.34" stroke-width="${Math.max(2, s / 90)}" stroke-linecap="round" stroke-linejoin="round"`;
  switch (kind) {
    case 'plate':
      return `<g ${st}><ellipse cx="${cx}" cy="${cy}" rx="${s * 0.46}" ry="${s * 0.28}"/><ellipse cx="${cx}" cy="${cy}" rx="${s * 0.3}" ry="${s * 0.18}"/></g>`;
    case 'bowl':
      return `<g ${st}><ellipse cx="${cx}" cy="${cy - s * 0.08}" rx="${s * 0.36}" ry="${s * 0.1}"/><path d="M${cx - s * 0.36} ${cy - s * 0.08} Q ${cx} ${cy + s * 0.42} ${cx + s * 0.36} ${cy - s * 0.08}"/></g>`;
    case 'glass':
      return `<g ${st}><path d="M${cx - s * 0.16} ${cy - s * 0.3} L${cx - s * 0.12} ${cy + s * 0.3} L${cx + s * 0.12} ${cy + s * 0.3} L${cx + s * 0.16} ${cy - s * 0.3}"/><path d="M${cx - s * 0.15} ${cy - s * 0.12} L${cx + s * 0.15} ${cy - s * 0.12}"/></g>`;
    case 'tall-glass':
      return `<g ${st}><rect x="${cx - s * 0.11}" y="${cy - s * 0.38}" width="${s * 0.22}" height="${s * 0.76}" rx="${s * 0.02}"/><path d="M${cx - s * 0.11} ${cy - s * 0.2} L${cx + s * 0.11} ${cy - s * 0.2}"/></g>`;
    case 'wine':
      return `<g ${st}><path d="M${cx - s * 0.14} ${cy - s * 0.36} Q ${cx - s * 0.16} ${cy - s * 0.02} ${cx} ${cy} Q ${cx + s * 0.16} ${cy - s * 0.02} ${cx + s * 0.14} ${cy - s * 0.36} Z"/><path d="M${cx} ${cy} L${cx} ${cy + s * 0.3} M${cx - s * 0.1} ${cy + s * 0.3} L${cx + s * 0.1} ${cy + s * 0.3}"/></g>`;
    case 'cup':
      return `<g ${st}><path d="M${cx - s * 0.16} ${cy - s * 0.1} L${cx - s * 0.12} ${cy + s * 0.12} L${cx + s * 0.12} ${cy + s * 0.12} L${cx + s * 0.16} ${cy - s * 0.1} Z"/><path d="M${cx + s * 0.15} ${cy - s * 0.04} q ${s * 0.1} 0 ${s * 0.08} ${s * 0.08} q -${s * 0.02} ${s * 0.06} -${s * 0.1} ${s * 0.04}"/><ellipse cx="${cx}" cy="${cy + s * 0.16}" rx="${s * 0.3}" ry="${s * 0.06}"/></g>`;
    case 'bottle':
      return `<g ${st}><path d="M${cx - s * 0.05} ${cy - s * 0.42} L${cx + s * 0.05} ${cy - s * 0.42} L${cx + s * 0.05} ${cy - s * 0.22} Q ${cx + s * 0.14} ${cy - s * 0.14} ${cx + s * 0.14} ${cy} L${cx + s * 0.14} ${cy + s * 0.36} L${cx - s * 0.14} ${cy + s * 0.36} L${cx - s * 0.14} ${cy} Q ${cx - s * 0.14} ${cy - s * 0.14} ${cx - s * 0.05} ${cy - s * 0.22} Z"/></g>`;
    case 'board':
      return `<g ${st}><circle cx="${cx - s * 0.22}" cy="${cy - s * 0.1}" r="${s * 0.14}"/><circle cx="${cx + s * 0.18}" cy="${cy - s * 0.14}" r="${s * 0.12}"/><ellipse cx="${cx}" cy="${cy + s * 0.2}" rx="${s * 0.18}" ry="${s * 0.1}"/></g>`;
    case 'hands':
      return `<g ${st}><ellipse cx="${cx}" cy="${cy + s * 0.12}" rx="${s * 0.3}" ry="${s * 0.16}"/><path d="M${cx - s * 0.46} ${cy - s * 0.3} Q ${cx - s * 0.3} ${cy - s * 0.1} ${cx - s * 0.26} ${cy + s * 0.06}"/><path d="M${cx + s * 0.46} ${cy - s * 0.3} Q ${cx + s * 0.3} ${cy - s * 0.1} ${cx + s * 0.26} ${cy + s * 0.06}"/></g>`;
    case 'room':
      return `<g ${st}><rect x="${cx - s * 0.62}" y="${cy - s * 0.34}" width="${s * 0.26}" height="${s * 0.46}"/><path d="M${cx - s * 0.2} ${cy + s * 0.14} L${cx + s * 0.1} ${cy + s * 0.14} M${cx - s * 0.16} ${cy + s * 0.14} L${cx - s * 0.16} ${cy + s * 0.34} M${cx + s * 0.06} ${cy + s * 0.14} L${cx + s * 0.06} ${cy + s * 0.34} M${cx + s * 0.24} ${cy + s * 0.14} L${cx + s * 0.54} ${cy + s * 0.14} M${cx + s * 0.28} ${cy + s * 0.14} L${cx + s * 0.28} ${cy + s * 0.34} M${cx + s * 0.5} ${cy + s * 0.14} L${cx + s * 0.5} ${cy + s * 0.34}"/></g>`;
    case 'patio':
      return `<g ${st}><path d="M${cx - s * 0.5} ${cy + s * 0.36} L${cx - s * 0.5} ${cy - s * 0.4} M${cx + s * 0.5} ${cy + s * 0.36} L${cx + s * 0.5} ${cy - s * 0.4}"/><ellipse cx="${cx}" cy="${cy + s * 0.16}" rx="${s * 0.2}" ry="${s * 0.05}"/><path d="M${cx} ${cy + s * 0.16} L${cx} ${cy + s * 0.36}"/></g>`;
    case 'bar':
      return `<g ${st}><path d="M${cx - s * 0.6} ${cy + s * 0.08} L${cx + s * 0.6} ${cy + s * 0.08}"/><rect x="${cx - s * 0.05}" y="${cy - s * 0.3}" width="${s * 0.1}" height="${s * 0.38}"/><path d="M${cx - s * 0.36} ${cy + s * 0.08} L${cx - s * 0.36} ${cy + s * 0.4} M${cx + s * 0.36} ${cy + s * 0.08} L${cx + s * 0.36} ${cy + s * 0.4}"/></g>`;
  }
}

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function placeholderSvg(a: VisualAsset): string {
  const [w, h] = DIMS[a.ratio];
  const s = Math.min(w, h) * 0.62;
  const bg = a.kind === 'product' ? (['glass', 'tall-glass', 'wine', 'cup', 'bottle'].includes(a.pictogram) ? '#E6E2D6' : '#EDE6D8') : '#E9E4D8';
  const fs = Math.round(Math.min(w, h) * 0.034);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Fotografia pendente: ${escapeXml(a.title)}">
<defs><pattern id="g" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0 L0 24" stroke="#252820" stroke-opacity="0.045" stroke-width="1"/></pattern></defs>
<rect width="${w}" height="${h}" fill="${bg}"/><rect width="${w}" height="${h}" fill="url(#g)"/>
${pictogram(a.pictogram, w / 2, h / 2 - fs, s)}
</svg>`;
}

export function buildPlaceholders(root = process.cwd()) {
  const outDir = path.join(root, 'public', 'demo-assets', 'patio-do-ferro');
  mkdirSync(outDir, { recursive: true });
  const manifest = visualAssets.map((a) => {
    const file = `${a.id}-${a.slug}.placeholder.svg`;
    writeFileSync(path.join(outDir, file), placeholderSvg(a));
    const [w, h] = DIMS[a.ratio];
    return {
      id: a.id, slug: a.slug, title: a.title, kind: a.kind, productId: a.productId ?? null, ratio: a.ratio, purpose: a.purpose,
      status: a.status, alt: a.alt,
      placeholder: { path: `public/demo-assets/patio-do-ferro/${file}`, width: w, height: h, bytes: statSync(path.join(outDir, file)).size },
      plannedVariants: a.purpose === 'hero'
        ? ['hero_desktop 1600w webp/jpg', 'hero_mobile 960w/640w webp/jpg (4:5 variation)']
        : a.kind === 'product' ? ['detail 1280w/768w webp/jpg', 'card 640w/320w webp/jpg', 'thumb 1:1 safe crop'] : ['detail 1280w/768w webp/jpg', 'card 640w webp/jpg'],
      source: { type: 'placeholder', tool: null, generatedAt: null, license: 'n/a — placeholder generated by scripts/lib/placeholders.ts' },
      production: { commands: a.commands, prompt: a.prompt, r0: R0, continuity: 'Bíblia S1–S4 (Arquitetura §16.1)' },
      approval: { approved: false, approvedBy: null, notes: 'Pendente: nenhuma ferramenta de geração com créditos disponível nesta execução.' },
    };
  });
  mkdirSync(path.join(root, 'assets'), { recursive: true });
  writeFileSync(path.join(root, 'assets', 'visual-manifest.json'), JSON.stringify({
    schemaVersion: 1, restaurant: 'patio-do-ferro', generatedBy: 'pnpm assets:build',
    note: 'Os 32 assets estão pendentes. Os ficheiros *.placeholder.svg são placeholders internos identificados; não são fotografias.',
    assets: manifest,
  }, null, 2) + '\n');
  return manifest;
}
