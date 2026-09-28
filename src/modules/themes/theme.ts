import type { CSSProperties } from 'react';
import type { Preset, ThemeTokens } from '@/modules/site/types';

export const PRESETS: { id: Preset; name: string; description: string; defaults: ThemeTokens }[] = [
  {
    id: 'casa-editorial', name: 'Casa editorial',
    description: 'Hero largo, título serifado, alternância de texto e fotografia, espaços largos.',
    defaults: { color: { background: '#F4F0E7', surface: '#FBF8F1', text: '#252820', muted: '#555E4A', accent: '#6F3038', border: '#D4CFC2' },
      fontPair: 'newsreader-plex', radius: '0', density: 'comfortable' },
  },
  {
    id: 'balcao-claro', name: 'Balcão claro',
    description: 'Hero dividido imagem/texto, sans mais presente, carta de leitura rápida, ritmo compacto.',
    defaults: { color: { background: '#FAF7F2', surface: '#FFFFFF', text: '#1F2328', muted: '#57606A', accent: '#9A4A1F', border: '#E3DED5' },
      fontPair: 'plex-only', radius: '8', density: 'compact' },
  },
  {
    id: 'noite-grafica', name: 'Noite gráfica',
    description: 'Fundo carvão, títulos sans fortes, divisórias marcadas e destaque tipográfico.',
    defaults: { color: { background: '#17181A', surface: '#222326', text: '#F1EDE4', muted: '#B7B2A8', accent: '#E0A43A', border: '#3A3C40' },
      fontPair: 'plex-only', radius: '4', density: 'comfortable' },
  },
];

function hexOk(v: string | undefined, fallback: string) {
  return v && /^#[0-9A-Fa-f]{6}$/.test(v) ? v : fallback;
}

/** CSS variables from validated tokens (allowlisted keys only; never arbitrary CSS). */
export function themeVars(tokens: ThemeTokens | undefined, preset: Preset): CSSProperties {
  const d = PRESETS.find((p) => p.id === preset)!.defaults;
  const c = tokens?.color ?? d.color;
  const pair = tokens?.fontPair ?? d.fontPair;
  return {
    '--c-bg': hexOk(c.background, d.color.background),
    '--c-surface': hexOk(c.surface, d.color.surface),
    '--c-text': hexOk(c.text, d.color.text),
    '--c-muted': hexOk(c.muted, d.color.muted),
    '--c-accent': hexOk(c.accent, d.color.accent),
    '--c-border': hexOk(c.border, d.color.border),
    '--radius': `${['0', '4', '8'].includes(tokens?.radius ?? '') ? tokens!.radius : d.radius}px`,
    '--font-display': pair === 'newsreader-plex' ? 'var(--font-serif)' : 'var(--font-sans)',
  } as CSSProperties;
}

// ---- Contrast (mirrors SQL validate_theme) -------------------------------------------------
function lum(hex: string) {
  const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}
export function contrast(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function themeProblems(t: ThemeTokens): { pair: string; ratio: number; min: number }[] {
  const c = t.color;
  const checks: [string, string, string, number][] = [
    ['texto / fundo', c.text, c.background, 4.5], ['texto / superfície', c.text, c.surface, 4.5],
    ['texto secundário / fundo', c.muted, c.background, 4.5], ['acento / fundo', c.accent, c.background, 3],
  ];
  return checks.filter(([, a, b, min]) => contrast(a, b) < min).map(([pair, a, b, min]) => ({ pair, ratio: Math.round(contrast(a, b) * 100) / 100, min }));
}

/** Text colour for buttons filled with the accent colour. */
export function onAccent(accent: string): string {
  return contrast('#FFFFFF', accent) >= 4.5 ? '#FFFFFF' : '#141414';
}
