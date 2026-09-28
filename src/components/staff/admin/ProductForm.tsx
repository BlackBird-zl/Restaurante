'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { formatAmount, formatEUR, parseEurosToCents } from '@/lib/money';
import { ALLERGEN_LABELS } from '@/modules/menu/types';
import { Button, ConfirmDialog, Field, Notice, inputClass } from '@/components/ui/primitives';
import { mediaKeyUrl } from '@/modules/media/url';
import { useAdminAction } from './useAdmin';
import type { AdminItem, AdminMedia, AdminMenu } from './menu-types';
import s from '../staff.module.css';

function slugify(v: string) {
  return v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

export function ProductForm({ slug, menu, item, media }: { slug: string; menu: AdminMenu; item: AdminItem | null; media: AdminMedia[] }) {
  const router = useRouter();
  const { act, pending, feedback } = useAdminAction();
  const [name, setName] = useState(item?.name ?? '');
  const [itemSlug, setItemSlug] = useState(item?.slug ?? '');
  const [price, setPrice] = useState(item ? formatAmount(item.priceCents) : '');
  const [allergens, setAllergens] = useState<string[]>(item?.allergens ?? []);
  const [archive, setArchive] = useState(false);
  const [priceErr, setPriceErr] = useState<string | null>(null);
  const base = `/r/${slug}/admin/carta/produtos`;
  const slugLocked = Boolean(item?.publishedAt);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const cents = parseEurosToCents(price);
    if (cents === null || cents < 1 || cents > 100000) { setPriceErr('Indique um preço entre 0,01 € e 1000,00 € (ex.: 16,00).'); return; }
    setPriceErr(null);
    const fields = {
      name: name.trim(), ...(slugLocked ? {} : { slug: itemSlug }), description: String(fd.get('description') ?? ''),
      ingredients: String(fd.get('ingredients') ?? ''), allergens, isVegetarian: fd.get('isVegetarian') === 'on',
      containsAlcohol: fd.get('containsAlcohol') === 'on', priceCents: cents, isVisible: fd.get('isVisible') === 'on',
      isAvailable: fd.get('isAvailable') === 'on', sortOrder: Number(fd.get('sortOrder') ?? 0),
      categoryId: String(fd.get('categoryId')), stationId: String(fd.get('stationId')),
    };
    if (item) {
      await act('save', `/menu/items/${item.id}`, { version: item.version, patch: fields }, { method: 'PATCH', ok: 'Produto guardado. A carta pública já mostra a alteração.' });
    } else {
      const r = await act<{ item: { id: string } }>('save', '/menu/items', fields, { ok: 'Produto criado.' });
      if (r.ok) router.push(`${base}/${r.data.item.id}`);
    }
  }

  const images = media.filter((m) => !m.archived && (m.purpose === 'product' || m.purpose === 'editorial'));
  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 16, maxWidth: 920 }}>
      <div className={s.pageHead}>
        <div>
          <p className={s.sub}><Link href={base}>Produtos</Link> / {item ? item.name : 'Novo'}</p>
          <h1 className={s.h1}>{item ? item.name : 'Novo produto'}</h1>
          {item ? <p className={s.sub}>Versão {item.version} · {item.orderCount} linha(s) de pedido usam este produto (histórico preservado)</p> : null}
        </div>
        <div className={s.toolbar}>
          {item && !item.archivedAt ? <Button type="button" variant="secondary" onClick={() => setArchive(true)}>Arquivar</Button> : null}
          <Button type="submit" variant="primary" size="lg" loading={pending === 'save'}>Guardar</Button>
        </div>
      </div>
      {feedback ? <Notice tone={feedback.tone === 'info' ? 'info' : feedback.tone}>{feedback.text}</Notice> : null}
      {item?.archivedAt ? <Notice tone="warn">Produto arquivado: não aparece na carta nem aceita pedidos. O histórico continua acessível.</Notice> : null}
      <div className={`${s.formGrid} ${s.formGrid2}`}>
        <Field label="Nome">{(p) => <input {...p} value={name} maxLength={80} required onChange={(e) => { setName(e.target.value); if (!item) setItemSlug(slugify(e.target.value)); }} />}</Field>
        <Field label="Endereço (slug)" hint={slugLocked ? 'Imutável depois de publicado, para não quebrar links e QR.' : 'Minúsculas e hífens.'}>
          {(p) => <input {...p} value={itemSlug} disabled={slugLocked} onChange={(e) => setItemSlug(slugify(e.target.value))} required />}
        </Field>
        <Field label="Preço (EUR, final)" error={priceErr} hint={item ? `Atual: ${formatEUR(item.priceCents)}` : 'Ex.: 16,00'}>
          {(p) => <input {...p} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} required />}
        </Field>
        <Field label="Ordem">{(p) => <input {...p} name="sortOrder" type="number" min={0} max={9999} defaultValue={item?.sortOrder ?? 100} />}</Field>
        <Field label="Categoria">{(p) => (
          <select {...p} name="categoryId" defaultValue={item?.categoryId ?? menu.categories[0]?.id}>
            {menu.categories.filter((c) => !c.archivedAt).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>)}
        </Field>
        <Field label="Estação" hint="Cada produto vai para exatamente uma estação. Pedidos já enviados mantêm a estação original.">{(p) => (
          <select {...p} name="stationId" defaultValue={item?.stationId ?? menu.stations[0]?.id}>
            {menu.stations.filter((st) => st.active).map((st) => <option key={st.id} value={st.id}>{st.name} ({st.code})</option>)}
          </select>)}
        </Field>
      </div>
      <Field label="Descrição curta" hint="Até 500 caracteres. Sem HTML.">{(p) => <textarea {...p} name="description" maxLength={500} defaultValue={item?.description} />}</Field>
      <Field label="Ingredientes">{(p) => <textarea {...p} name="ingredients" maxLength={500} defaultValue={item?.ingredients} />}</Field>
      <fieldset className={s.card} style={{ boxShadow: 'none' }}>
        <legend style={{ fontWeight: 700 }}>Alergénios declarados</legend>
        <p className={s.sub}>Informação para o cliente; o restaurante valida ingredientes e contaminação cruzada.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 4 }}>
          {Object.entries(ALLERGEN_LABELS).map(([code, label]) => (
            <label key={code} className={s.switchRow}>
              <input type="checkbox" className={s.check} checked={allergens.includes(code)}
                onChange={(e) => setAllergens((a) => (e.target.checked ? [...a, code] : a.filter((x) => x !== code)))} />{label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className={s.toolbar}>
        <label className={s.switchRow}><input type="checkbox" className={s.check} name="isVisible" defaultChecked={item?.isVisible ?? false} />Visível na carta</label>
        <label className={s.switchRow}><input type="checkbox" className={s.check} name="isAvailable" defaultChecked={item?.isAvailable ?? true} />Disponível hoje</label>
        <label className={s.switchRow}><input type="checkbox" className={s.check} name="isVegetarian" defaultChecked={item?.isVegetarian} />Vegetariano</label>
        <label className={s.switchRow}><input type="checkbox" className={s.check} name="containsAlcohol" defaultChecked={item?.containsAlcohol} />Contém álcool</label>
      </div>
      {item ? (
        <section className={s.card} style={{ boxShadow: 'none' }} aria-labelledby="cover-h">
          <h2 id="cover-h" className={s.h2}>Capa</h2>
          <div className={s.toolbar}>
            {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of an already-optimised variant */}
            {item.cover ? <img src={mediaKeyUrl((media.find((m) => m.id === item.cover!.id)?.variants ?? [])[0]?.key ?? item.cover.key)} alt="" width={80} height={100} style={{ objectFit: 'cover', borderRadius: 6 }} /> : <span className={s.muted}>Sem capa</span>}
            <select className={inputClass} style={{ maxWidth: 360 }} defaultValue={item.cover?.id ?? ''} aria-label="Escolher capa"
              onChange={(e) => void act('cover', `/menu/items/${item.id}/cover`, { mediaId: e.target.value || null }, { ok: 'Capa atualizada.' })}>
              <option value="">Sem capa</option>
              {images.map((m) => <option key={m.id} value={m.id}>{m.alt || m.key.split('/').pop()}{m.sourceType === 'placeholder' ? ' (placeholder)' : ''}</option>)}
            </select>
          </div>
          <p className={s.sub}>Carregue fotografias em Site e marca → Media. Cada produto deve ter a sua própria fotografia.</p>
        </section>
      ) : null}
      {item ? (
        <ConfirmDialog open={archive} onOpenChange={setArchive} tone="danger" confirmLabel="Arquivar" loading={pending === 'archive'}
          title={`Arquivar ${item.name}?`} description="Sai da carta e deixa de aceitar pedidos. Pedidos, contas e histórico não são apagados."
          onConfirm={async () => { const r = await act('archive', `/menu/items/${item.id}`, { version: item.version }, { method: 'DELETE', ok: 'Produto arquivado.' }); setArchive(false); if (r.ok) router.push(base); }} />
      ) : null}
    </form>
  );
}
