'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatEUR } from '@/lib/money';
import { normalizeSearch } from '@/modules/menu/types';
import { Notice, inputClass } from '@/components/ui/primitives';
import { useAdminAction } from './useAdmin';
import type { AdminMenu } from './menu-types';
import s from '../staff.module.css';

export function ProductList({ slug, menu }: { slug: string; menu: AdminMenu }) {
  const { act, pending, feedback } = useAdminAction();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const base = `/r/${slug}/admin/carta/produtos`;
  const items = useMemo(() => menu.items.filter((i) => (showArchived || !i.archivedAt) && (!cat || i.categoryId === cat)
    && (!q || normalizeSearch(i.name).includes(normalizeSearch(q)))), [menu.items, q, cat, showArchived]);
  const station = (id: string) => menu.stations.find((st) => st.id === id);
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className={s.pageHead}>
        <div><h1 className={s.h1}>Produtos</h1><p className={s.sub}>Preço e disponibilidade mudam de imediato na carta pública e nos novos pedidos. Pedidos anteriores mantêm o preço de então.</p></div>
        <Link href={`${base}/novo`} className={s.sub} style={{ fontWeight: 700 }}>+ Novo produto</Link>
      </div>
      {menu.featuredWarnings.length ? <Notice tone="warn">Há destaques da Home que apontam para produtos ocultos ou arquivados. Reveja em Site e marca.</Notice> : null}
      {feedback ? <Notice tone={feedback.tone === 'info' ? 'info' : feedback.tone}>{feedback.text}</Notice> : null}
      <div className={s.toolbar}>
        <input className={inputClass} style={{ maxWidth: 280 }} placeholder="Pesquisar" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Pesquisar produto" />
        <select className={inputClass} style={{ maxWidth: 220 }} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {menu.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className={s.switchRow}><input type="checkbox" className={s.check} checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />Mostrar arquivados</label>
      </div>
      <table className={s.table}>
        <thead><tr><th>Produto</th><th>Categoria</th><th>Estação</th><th className="num">Preço</th><th>Visível</th><th>Disponível</th><th /></tr></thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} style={i.archivedAt ? { opacity: 0.55 } : undefined}>
              <td data-label="Produto"><Link href={`${base}/${i.id}`}><strong>{i.name}</strong></Link>
                {i.cover?.sourceType === 'placeholder' ? <span className={s.pill} style={{ marginLeft: 6 }}>foto pendente</span> : null}
                {i.archivedAt ? <span className={s.pill} style={{ marginLeft: 6 }}>arquivado</span> : null}</td>
              <td data-label="Categoria">{menu.categories.find((c) => c.id === i.categoryId)?.name}</td>
              <td data-label="Estação">{station(i.stationId)?.code}</td>
              <td data-label="Preço" className="num">{formatEUR(i.priceCents)}</td>
              <td data-label="Visível">{i.isVisible ? 'Sim' : 'Não'}</td>
              <td data-label="Disponível">
                <label className={s.switchRow} style={{ justifyContent: 'flex-end' }}>
                  <input type="checkbox" className={s.check} checked={i.isAvailable} disabled={Boolean(i.archivedAt) || pending !== null}
                    aria-label={`${i.name} disponível`}
                    onChange={(e) => void act(`av-${i.id}`, `/menu/items/${i.id}/availability`, { available: e.target.checked, version: i.version },
                      { method: 'PATCH', ok: `${i.name}: ${e.target.checked ? 'disponível' : 'esgotado'}.` })} />
                  {i.isAvailable ? 'Sim' : 'Esgotado'}
                </label>
              </td>
              <td data-label=""><Link href={`${base}/${i.id}`}>Editar</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 ? <p className={s.muted}>Nenhum produto com estes filtros.</p> : null}
    </div>
  );
}
