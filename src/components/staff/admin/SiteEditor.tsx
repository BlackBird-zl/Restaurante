'use client';
import Link from 'next/link';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { mediaKeyUrl } from '@/modules/media/url';
import { PRESETS, contrast, themeProblems } from '@/modules/themes/theme';
import type { Preset, ThemeTokens } from '@/modules/site/types';
import { Button, Field, Notice } from '@/components/ui/primitives';
import { useAdminAction } from './useAdmin';
import type { AdminMedia } from './menu-types';
import { MediaLibrary } from './MediaLibrary';
import s from '../staff.module.css';

type PageState = { draft: Record<string, unknown>; published: Record<string, unknown> | null; publishedAt: string | null; version: number; dirty: boolean };
type SiteAdmin = {
  pages: Record<string, PageState>;
  theme: { preset: Preset; draft: ThemeTokens; published: ThemeTokens; version: number; publishedAt: string | null; problems: unknown[] };
  media: AdminMedia[];
  items: { id: string; name: string; visible: boolean }[];
};

const TABS: { key: string; label: string }[] = [
  { key: 'home', label: 'Home' }, { key: 'about', label: 'Sobre' }, { key: 'ambience', label: 'Ambiente' }, { key: 'contact', label: 'Contactos' },
  { key: 'reservations', label: 'Reservas' }, { key: 'privacy', label: 'Privacidade' }, { key: 'theme', label: 'Tema' }, { key: 'media', label: 'Media' },
];
const CTAS = [['carta', 'Carta'], ['reservas', 'Reservas'], ['ambiente', 'Ambiente'], ['sobre', 'Sobre'], ['contactos', 'Contactos']];

type Obj = Record<string, unknown>;
const get = (o: unknown, path: string): unknown => path.split('.').reduce<unknown>((a, k) => (a && typeof a === 'object' ? (a as Obj)[k] : undefined), o);
function set(o: Obj, path: string, value: unknown): Obj {
  const [k, ...rest] = path.split('.');
  const copy: Obj = Array.isArray(o) ? ([...(o as unknown[])] as unknown as Obj) : { ...o };
  copy[k!] = rest.length ? set(((o?.[k!] as Obj) ?? {}), rest.join('.'), value) : value;
  return copy;
}

export function SiteEditor({ slug, data, previewHref }: { slug: string; data: SiteAdmin; previewHref: string }) {
  const [tab, setTab] = useState('home');
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className={s.pageHead}>
        <div><h1 className={s.h1}>Site e marca</h1><p className={s.sub}>Guardar rascunho não altera o site. Publicar valida referências e contraste. Produtos e preços são geridos na Carta (efeito imediato).</p></div>
        <div className={s.toolbar}>
          <Link href={`/r/${slug}/admin/site/pre-visualizar`} className={s.sub} style={{ fontWeight: 700 }}>Pré-visualizar rascunho</Link>
          <a href={previewHref} target="_blank" rel="noreferrer" className={s.sub}>Abrir site publicado ↗</a>
        </div>
      </div>
      <nav className={s.toolbar} aria-label="Secções">
        {TABS.map((t) => (
          <button key={t.key} type="button" className={s.pill} onClick={() => setTab(t.key)} aria-pressed={tab === t.key}
            style={{ minHeight: 40, padding: '0 14px', cursor: 'pointer', border: 0, ...(tab === t.key ? { background: 'var(--n-900)', color: '#fff' } : {}) }}>
            {t.label}{data.pages[t.key]?.dirty ? ' •' : ''}
          </button>
        ))}
      </nav>
      {tab === 'theme' ? <ThemeEditor theme={data.theme} /> : tab === 'media' ? <MediaLibrary media={data.media} /> : data.pages[tab] ? (
        <PageEditor key={`${tab}:${data.pages[tab].version}`} pageKey={tab} page={data.pages[tab]} media={data.media} items={data.items} />
      ) : <p className={s.muted}>Página não configurada.</p>}
    </div>
  );
}

function PageEditor({ pageKey, page, media, items }: { pageKey: string; page: PageState; media: AdminMedia[]; items: SiteAdmin['items'] }) {
  const { act, pending, feedback } = useAdminAction();
  const [draft, setDraft] = useState<Obj>(page.draft as Obj);
  const images = media.filter((m) => !m.archived);
  const text = (path: string, label: string, max: number, long = false, hint?: string) => (
    <Field label={label} hint={hint ?? `Até ${max} caracteres.`}>
      {(p) => long
        ? <textarea {...p} maxLength={max} value={String(get(draft, path) ?? '')} onChange={(e) => setDraft((d) => set(d, path, e.target.value))} />
        : <input {...p} maxLength={max} value={String(get(draft, path) ?? '')} onChange={(e) => setDraft((d) => set(d, path, e.target.value))} />}
    </Field>
  );
  const mediaSelect = (path: string, label: string) => (
    <Field label={label}>
      {(p) => (
        <select {...p} value={String(get(draft, path) ?? '')} onChange={(e) => setDraft((d) => set(d, path, e.target.value || null))}>
          <option value="">Sem imagem</option>
          {images.map((m) => <option key={m.id} value={m.id}>{m.alt ? m.alt.slice(0, 70) : m.key.split('/').pop()}{m.sourceType === 'placeholder' ? ' (placeholder)' : ''}{m.approved ? '' : ' — não aprovada'}</option>)}
        </select>
      )}
    </Field>
  );
  const itemSelect = (path: string, label: string) => (
    <Field label={label}>
      {(p) => (
        <select {...p} value={String(get(draft, path) ?? '')} onChange={(e) => setDraft((d) => set(d, path, e.target.value))}>
          <option value="">Escolher produto</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name}{i.visible ? '' : ' (oculto)'}</option>)}
        </select>
      )}
    </Field>
  );
  const ctaSelect = (path: string, label: string) => (
    <Field label={label}>{(p) => (
      <select {...p} value={String(get(draft, path) ?? '')} onChange={(e) => setDraft((d) => set(d, path, e.target.value))}>
        {CTAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>)}
    </Field>
  );

  let form: ReactNode = null;
  if (pageKey === 'home') {
    form = <>
      <fieldset className={s.card}><legend className={s.h2}>Hero</legend>
        {text('hero.eyebrow', 'Antetítulo', 60)}{text('hero.title', 'Título', 60)}{text('hero.body', 'Texto', 140, true)}
        {mediaSelect('hero.mediaId', 'Fotografia')}
        <div className={`${s.formGrid} ${s.formGrid2}`}>{ctaSelect('hero.primaryLink', 'Botão principal leva a')}{text('hero.primaryLabel', 'Texto do botão principal', 30)}
          {ctaSelect('hero.secondaryLink', 'Ligação secundária leva a')}{text('hero.secondaryLabel', 'Texto da ligação secundária', 30)}</div>
      </fieldset>
      <fieldset className={s.card}><legend className={s.h2}>Apresentação</legend>{text('intro.title', 'Título', 120)}{text('intro.body', 'Texto', 600, true)}{text('intro.signature', 'Assinatura (opcional)', 80)}</fieldset>
      <fieldset className={s.card}><legend className={s.h2}>Da cozinha (três produtos reais; preços vêm da carta)</legend>
        {text('featured.title', 'Título', 60)}{text('featured.ctaLabel', 'Texto do link', 30)}
        <div className={`${s.formGrid} ${s.formGrid2}`}>{[0, 1, 2].map((i) => <div key={i}>{itemSelect(`featuredItemIds.${i}`, `Destaque ${i + 1}`)}</div>)}</div>
      </fieldset>
      <fieldset className={s.card}><legend className={s.h2}>Ambiente</legend>{text('ambience.title', 'Título', 120)}{text('ambience.body', 'Texto', 600, true)}
        <div className={`${s.formGrid} ${s.formGrid2}`}>{mediaSelect('ambience.mediaIds.0', 'Imagem larga')}{mediaSelect('ambience.mediaIds.1', 'Imagem vertical')}</div>{text('ambience.linkLabel', 'Texto do link', 30)}</fieldset>
      <fieldset className={s.card}><legend className={s.h2}>Do bar</legend>{text('bar.title', 'Título', 120)}
        <div className={`${s.formGrid} ${s.formGrid2}`}>{itemSelect('bar.itemIds.0', 'Bebida 1')}{itemSelect('bar.itemIds.1', 'Bebida 2')}</div>{mediaSelect('bar.mediaIds.0', 'Fotografia')}{text('bar.linkLabel', 'Texto do link', 30)}</fieldset>
      <fieldset className={s.card}><legend className={s.h2}>Visita e rodapé</legend>{text('visit.title', 'Título', 60)}{text('visit.body', 'Localização', 160)}{text('footer.note', 'Nota de rodapé', 160)}</fieldset>
    </>;
  } else if (pageKey === 'about') {
    form = <fieldset className={s.card}><legend className={s.h2}>Sobre</legend>{text('title', 'Título', 80)}{text('intro', 'Introdução', 600, true)}
      {text('paragraphs.0', 'Parágrafo 1', 600, true)}{text('paragraphs.1', 'Parágrafo 2', 600, true)}
      <div className={`${s.formGrid} ${s.formGrid2}`}>{mediaSelect('mediaIds.0', 'Imagem 1')}{mediaSelect('mediaIds.1', 'Imagem 2')}</div>{text('signature', 'Assinatura (opcional)', 80)}{text('conceptNote', 'Nota de conceito', 300, true)}</fieldset>;
  } else if (pageKey === 'ambience') {
    const imgs = (get(draft, 'images') as { mediaId: string; caption?: string }[] | undefined) ?? [];
    form = <fieldset className={s.card}><legend className={s.h2}>Ambiente</legend>{text('title', 'Título', 80)}{text('intro', 'Introdução', 600, true)}
      {imgs.map((_, i) => (
        <div key={i} className={`${s.formGrid} ${s.formGrid2}`} style={{ alignItems: 'end' }}>{mediaSelect(`images.${i}.mediaId`, `Imagem ${i + 1}`)}
          <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}><div style={{ flex: 1 }}>{text(`images.${i}.caption`, 'Legenda', 160)}</div>
            <Button type="button" variant="ghost" onClick={() => setDraft((d) => ({ ...d, images: imgs.filter((__, j) => j !== i) }))}>Remover</Button></div></div>
      ))}
      {imgs.length < 8 ? <div><Button type="button" variant="secondary" onClick={() => setDraft((d) => ({ ...d, images: [...imgs, { mediaId: images[0]?.id ?? '', caption: '' }] }))}>+ Imagem</Button></div> : null}
    </fieldset>;
  } else if (pageKey === 'contact') {
    form = <fieldset className={s.card}><legend className={s.h2}>Contactos</legend>{text('title', 'Título', 80)}{text('intro', 'Introdução', 600, true, 'Horários e contactos vêm das Configurações.')}</fieldset>;
  } else if (pageKey === 'reservations') {
    form = <fieldset className={s.card}><legend className={s.h2}>Reservas</legend>{text('title', 'Título', 80)}{text('body', 'Texto', 600, true)}{text('demoNotice', 'Aviso (demo/simulação)', 160)}</fieldset>;
  } else if (pageKey === 'privacy') {
    const secs = (get(draft, 'sections') as { title: string; body: string }[] | undefined) ?? [];
    form = <fieldset className={s.card}><legend className={s.h2}>Privacidade</legend>
      <Notice tone="warn">Numa instalação real, identifique o responsável e use texto aprovado pelo restaurante. Este editor não certifica conformidade jurídica.</Notice>
      {text('title', 'Título', 80)}
      {secs.map((_, i) => <div key={i} className={s.card} style={{ boxShadow: 'none' }}>{text(`sections.${i}.title`, `Secção ${i + 1} — título`, 120)}{text(`sections.${i}.body`, 'Texto', 600, true)}
        <div><Button type="button" variant="ghost" onClick={() => setDraft((d) => ({ ...d, sections: secs.filter((__, j) => j !== i) }))}>Remover secção</Button></div></div>)}
      {secs.length < 12 ? <div><Button type="button" variant="secondary" onClick={() => setDraft((d) => ({ ...d, sections: [...secs, { title: '', body: '' }] }))}>+ Secção</Button></div> : null}
    </fieldset>;
  }

  function clean(o: Obj): Obj {
    // Remove empty optional strings so strict schemas accept them.
    return JSON.parse(JSON.stringify(o, (_k, v) => (v === '' ? undefined : v)));
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    await act('save', `/site/${pageKey}`, { version: page.version, draft: clean(draft) }, { method: 'PATCH', ok: 'Rascunho guardado. O site público ainda não mudou.' });
  }
  const unsaved = JSON.stringify(clean(draft)) !== JSON.stringify(clean(page.draft as Obj));
  return (
    <form onSubmit={save} style={{ display: 'grid', gap: 14, maxWidth: 900 }}>
      {feedback ? <Notice tone={feedback.tone === 'info' ? 'info' : feedback.tone}>{feedback.text}</Notice> : null}
      <p className={s.sub}>Versão {page.version} · {page.publishedAt ? `publicado em ${new Date(page.publishedAt).toLocaleString('pt-PT')}` : 'nunca publicado'}{page.dirty ? ' · há alterações por publicar' : ''}</p>
      {form}
      <div className={s.actions} style={{ position: 'sticky', bottom: 0, background: 'var(--n-50)', padding: '10px 0' }}>
        <Button type="submit" variant="secondary" size="lg" loading={pending === 'save'} disabled={!unsaved}>Guardar rascunho</Button>
        <Button type="button" variant="primary" size="lg" loading={pending === 'publish'} disabled={unsaved || !page.dirty}
          onClick={() => void act('publish', `/site/${pageKey}/publish`, { version: page.version }, { ok: 'Publicado. O site público já mostra esta versão.' })}>Publicar</Button>
        {unsaved ? <span className={s.sub}>Guarde o rascunho antes de publicar.</span> : null}
      </div>
    </form>
  );
}

function ThemeEditor({ theme }: { theme: SiteAdmin['theme'] }) {
  const { act, pending, feedback } = useAdminAction();
  const [preset, setPreset] = useState<Preset>(theme.preset);
  const [tokens, setTokens] = useState<ThemeTokens>(theme.draft);
  const problems = useMemo(() => themeProblems(tokens), [tokens]);
  const COLORS: [keyof ThemeTokens['color'], string][] = [['background', 'Fundo'], ['surface', 'Superfície'], ['text', 'Texto'], ['muted', 'Texto secundário'], ['accent', 'Acento'], ['border', 'Linhas']];
  async function save(publish: boolean) {
    await act(publish ? 'publish' : 'save', '/theme', { version: theme.version, preset, tokens, publish }, { method: 'PATCH', ok: publish ? 'Tema publicado.' : 'Rascunho do tema guardado.' });
  }
  return (
    <div style={{ display: 'grid', gap: 14, maxWidth: 900 }}>
      {feedback ? <Notice tone={feedback.tone === 'info' ? 'info' : feedback.tone}>{feedback.text}</Notice> : null}
      <fieldset className={s.card}><legend className={s.h2}>Preset</legend>
        <p className={s.sub}>Cada preset muda a composição do Hero, dos destaques e do bloco de ambiente — não só as cores. A operação mantém cores de estado fixas.</p>
        {PRESETS.map((p) => (
          <label key={p.id} className={s.switchRow} style={{ alignItems: 'flex-start' }}>
            <input type="radio" name="preset" className={s.check} checked={preset === p.id} onChange={() => { setPreset(p.id); setTokens(p.defaults); }} />
            <span><strong>{p.name}</strong><br /><span className={s.sub}>{p.description}</span></span>
          </label>
        ))}
      </fieldset>
      <fieldset className={s.card}><legend className={s.h2}>Cores (tokens validados)</legend>
        <div className={`${s.formGrid} ${s.formGrid2}`}>
          {COLORS.map(([k, label]) => (
            <label key={k} className={s.switchRow}>
              <input type="color" value={tokens.color[k]} onChange={(e) => setTokens((t) => ({ ...t, color: { ...t.color, [k]: e.target.value.toUpperCase() } }))} aria-label={label} style={{ width: 48, height: 40, border: 0 }} />
              <span>{label} <span className={s.sub}>{tokens.color[k]}</span></span>
            </label>
          ))}
        </div>
        <div className={`${s.formGrid} ${s.formGrid2}`}>
          <Field label="Tipografia">{(p) => <select {...p} value={tokens.fontPair} onChange={(e) => setTokens((t) => ({ ...t, fontPair: e.target.value as ThemeTokens['fontPair'] }))}><option value="newsreader-plex">Newsreader + IBM Plex Sans</option><option value="plex-only">IBM Plex Sans</option></select>}</Field>
          <Field label="Cantos">{(p) => <select {...p} value={tokens.radius} onChange={(e) => setTokens((t) => ({ ...t, radius: e.target.value as ThemeTokens['radius'] }))}><option value="0">Retos</option><option value="4">4 px</option><option value="8">8 px</option></select>}</Field>
          <Field label="Densidade">{(p) => <select {...p} value={tokens.density} onChange={(e) => setTokens((t) => ({ ...t, density: e.target.value as ThemeTokens['density'] }))}><option value="comfortable">Confortável</option><option value="compact">Compacta</option></select>}</Field>
        </div>
        <div style={{ padding: 18, borderRadius: 10, background: tokens.color.background, color: tokens.color.text, border: `1px solid ${tokens.color.border}` }}>
          <p style={{ fontFamily: tokens.fontPair === 'newsreader-plex' ? 'var(--font-serif)' : 'var(--font-sans)', fontSize: '1.6rem' }}>Título de exemplo</p>
          <p style={{ color: tokens.color.muted }}>Texto secundário de exemplo · contraste {contrast(tokens.color.muted, tokens.color.background).toFixed(1)}:1</p>
          <span style={{ display: 'inline-block', marginTop: 8, padding: '10px 16px', background: tokens.color.accent, color: contrast('#FFFFFF', tokens.color.accent) >= 4.5 ? '#fff' : '#111', borderRadius: Number(tokens.radius) }}>Ver a carta</span>
        </div>
        {problems.length ? (
          <Notice tone="danger">Contraste insuficiente: {problems.map((p) => `${p.pair} ${p.ratio}:1 (mín. ${p.min}:1)`).join('; ')}. Escureça o texto ou aclare o fundo.</Notice>
        ) : <Notice tone="ok">Pares de contraste verificados.</Notice>}
      </fieldset>
      <div className={s.actions}>
        <Button variant="secondary" size="lg" loading={pending === 'save'} onClick={() => void save(false)}>Guardar rascunho</Button>
        <Button variant="primary" size="lg" loading={pending === 'publish'} disabled={problems.length > 0} onClick={() => void save(true)}>Publicar tema</Button>
      </div>
      <p className={s.sub}>Sem CSS, JavaScript, HTML livre ou fontes por URL: apenas tokens permitidos.</p>
    </div>
  );
}

export function mediaThumb(m: AdminMedia) {
  const v = (m.variants ?? []).find((x) => x.role === 'thumb' || x.role === 'card') ?? (m.variants ?? [])[0];
  return mediaKeyUrl(v?.key ?? m.key);
}
