import type { Metadata } from 'next';
import Link from 'next/link';
import { formatEUR } from '@/lib/money';
import { formatDateTime } from '@/lib/time';
import { ORDER_STATUS, padOrderNumber, type OrderStatus } from '@/modules/orders/status';
import { staffRpc } from '@/modules/auth/staff.server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import s from '@/components/staff/staff.module.css';

export const metadata: Metadata = { title: 'Pedidos · Administração' };

type Row = { id: string; number: number; submittedAt: string; source: string; tableLabel: string; status: OrderStatus; totalCents: number; units: number; businessDate: string };

export default async function OrdersPage({ params, searchParams }: { params: Promise<{ restaurantSlug: string }>; searchParams: Promise<{ at?: string; id?: string; data?: string }> }) {
  const slug = (await params).restaurantSlug;
  const sp = await searchParams;
  const d = await staffRpc<{ orders: Row[]; nextCursor: { at: string; id: string } | null }>('staff_list_orders', {
    p_restaurant_slug: slug, p_cursor_at: sp.at ?? null, p_cursor_id: sp.id ?? null, p_limit: 50, p_business_date: sp.data ?? null,
  });
  const base = `/r/${slug}/admin/pedidos`;
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className={s.pageHead}>
        <div><h1 className={s.h1}>Pedidos</h1><p className={s.sub}>Gestão de pedidos e KDS são projeções dos mesmos registos. Mais recentes primeiro.</p></div>
        <form className={s.toolbar} action={base}>
          <label className="sr-only" htmlFor="data">Dia operacional</label>
          <input id="data" name="data" type="date" defaultValue={sp.data} className={s.sub} style={{ minHeight: 40 }} />
          <button type="submit" style={{ minHeight: 40, padding: '0 12px' }}>Filtrar</button>
          {sp.data ? <Link href={base}>Limpar</Link> : null}
        </form>
      </div>
      <table className={s.table}>
        <thead><tr><th>Pedido</th><th>Mesa</th><th>Enviado</th><th>Origem</th><th>Estado</th><th className="num">Unid.</th><th className="num">Valor pedido</th></tr></thead>
        <tbody>
          {d.orders.map((o) => (
            <tr key={o.id}>
              <td data-label="Pedido"><Link href={`${base}/${o.id}`}><strong>#{padOrderNumber(o.number)}</strong></Link></td>
              <td data-label="Mesa">{o.tableLabel}</td>
              <td data-label="Enviado">{formatDateTime(o.submittedAt)}</td>
              <td data-label="Origem">{o.source === 'guest' ? 'Cliente' : 'Equipa (assistido)'}</td>
              <td data-label="Estado"><StatusBadge meta={ORDER_STATUS[o.status]} /></td>
              <td data-label="Unid." className="num">{o.units}</td>
              <td data-label="Valor pedido" className="num">{formatEUR(o.totalCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {d.orders.length === 0 ? <p className={s.muted}>Sem pedidos neste período.</p> : null}
      {d.nextCursor ? <Link href={`${base}?at=${encodeURIComponent(d.nextCursor.at)}&id=${d.nextCursor.id}${sp.data ? `&data=${sp.data}` : ''}`}>Mais antigos →</Link> : null}
    </div>
  );
}
