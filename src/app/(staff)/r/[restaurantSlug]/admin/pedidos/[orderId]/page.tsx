import type { Metadata } from 'next';
import Link from 'next/link';
import { formatEUR } from '@/lib/money';
import { formatDateTime, formatTime } from '@/lib/time';
import { LINE_STATUS, padOrderNumber, type LineStatus } from '@/modules/orders/status';
import { staffRpc } from '@/modules/auth/staff.server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import s from '@/components/staff/staff.module.css';

export const metadata: Metadata = { title: 'Pedido · Administração' };

type Detail = {
  id: string; number: number; submittedAt: string; source: string; assistedReason: string | null; tableLabel: string; visitStatus: string; createdBy: string | null;
  lines: { id: string; name: string; quantity: number; unitPriceCents: number; status: LineStatus; note: string | null; stationCode: string; preparedStartedAt: string | null;
    readyAt: string | null; pickedUpAt: string | null; deliveredAt: string | null; cancelReason: string | null; currentPriceCents: number; currentName: string }[];
  events: { at: string; type: string; from: string | null; to: string | null; reason: string | null; actorKind: string; actor: string | null }[];
};

const EVENT_LABEL: Record<string, string> = {
  'order.submitted': 'Pedido enviado', 'item.preparing': 'Preparação iniciada', 'item.ready': 'Pronto', 'item.delivering': 'Recolhido pelo salão',
  'item.delivered': 'Entregue', 'item.cancelled': 'Anulado', 'item.delivery_reassigned': 'Entrega reatribuída',
};

export default async function OrderDetail({ params }: { params: Promise<{ restaurantSlug: string; orderId: string }> }) {
  const p = await params;
  const o = await staffRpc<Detail>('staff_get_order', { p_restaurant_slug: p.restaurantSlug, p_order_id: p.orderId });
  const total = o.lines.filter((l) => l.status !== 'cancelled').reduce((a, l) => a + l.quantity * l.unitPriceCents, 0);
  return (
    <div style={{ display: 'grid', gap: 14, maxWidth: 1000 }}>
      <div className={s.pageHead}>
        <div>
          <p className={s.sub}><Link href={`/r/${p.restaurantSlug}/admin/pedidos`}>Pedidos</Link> / #{padOrderNumber(o.number)}</p>
          <h1 className={s.h1}>Pedido #{padOrderNumber(o.number)} · Mesa {o.tableLabel}</h1>
          <p className={s.sub}>{formatDateTime(o.submittedAt)} · {o.source === 'guest' ? 'enviado pelo cliente' : `assistido por ${o.createdBy}`}{o.assistedReason ? ` (${o.assistedReason})` : ''}</p>
        </div>
      </div>
      <table className={s.table}>
        <thead><tr><th>Linha</th><th>Estação</th><th>Estado</th><th>Tempos</th><th className="num">Preço (snapshot)</th></tr></thead>
        <tbody>
          {o.lines.map((l) => (
            <tr key={l.id}>
              <td data-label="Linha"><strong>{l.quantity}× {l.name}</strong>{l.note ? <div className={s.sub}>Nota: {l.note}</div> : null}
                {l.currentPriceCents !== l.unitPriceCents || l.currentName !== l.name ? <div className={s.sub}>Carta atual: {l.currentName} {formatEUR(l.currentPriceCents)} — o histórico mantém o valor do pedido.</div> : null}
                {l.cancelReason ? <div className={s.sub}>Motivo: {l.cancelReason}</div> : null}</td>
              <td data-label="Estação">{l.stationCode}</td>
              <td data-label="Estado"><StatusBadge meta={LINE_STATUS[l.status]} /></td>
              <td data-label="Tempos" className={s.sub}>
                {[l.preparedStartedAt && `início ${formatTime(l.preparedStartedAt)}`, l.readyAt && `pronto ${formatTime(l.readyAt)}`, l.pickedUpAt && `recolha ${formatTime(l.pickedUpAt)}`, l.deliveredAt && `entregue ${formatTime(l.deliveredAt)}`].filter(Boolean).join(' · ') || '—'}
              </td>
              <td data-label="Preço" className="num">{formatEUR(l.quantity * l.unitPriceCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ textAlign: 'right' }}><strong>Total do pedido: {formatEUR(total)}</strong></p>
      <section className={s.card} aria-labelledby="ev">
        <h2 id="ev" className={s.h2}>Histórico de eventos</h2>
        <ol style={{ listStyle: 'none', display: 'grid' }}>
          {o.events.map((e, i) => (
            <li key={i} className={s.row}><span><strong className="tabular">{formatTime(e.at)}</strong> · {EVENT_LABEL[e.type] ?? e.type}{e.reason ? ` — ${e.reason}` : ''}</span>
              <span className={s.sub}>{e.actorKind === 'guest' ? 'Cliente (mesa)' : e.actor ?? 'Sistema'}</span></li>
          ))}
        </ol>
      </section>
    </div>
  );
}
