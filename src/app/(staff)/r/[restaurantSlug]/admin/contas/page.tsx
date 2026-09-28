import type { Metadata } from 'next';
import Link from 'next/link';
import { formatEUR } from '@/lib/money';
import { formatDateTime } from '@/lib/time';
import { BILL_STATUS, PAYMENT_METHOD, type BillStatus, type PaymentMethod } from '@/modules/orders/status';
import { staffRpc } from '@/modules/auth/staff.server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import s from '@/components/staff/staff.module.css';

export const metadata: Metadata = { title: 'Contas · Administração' };
type Row = { id: string; visitId: string; status: BillStatus; totalCents: number; tableLabel: string; createdAt: string; voidReason: string | null;
  payment: { method: PaymentMethod; amountCents: number; recordedAt: string } | null };

export default async function BillsPage({ params, searchParams }: { params: Promise<{ restaurantSlug: string }>; searchParams: Promise<{ at?: string; id?: string }> }) {
  const slug = (await params).restaurantSlug;
  const sp = await searchParams;
  const d = await staffRpc<{ bills: Row[]; nextCursor: { at: string; id: string } | null }>('staff_list_bills', { p_restaurant_slug: slug, p_cursor_at: sp.at ?? null, p_cursor_id: sp.id ?? null, p_limit: 50 });
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className={s.pageHead}><div><h1 className={s.h1}>Contas</h1><p className={s.sub}>Registos internos de recebimento. Não são faturas nem documentos fiscais.</p></div></div>
      <table className={s.table}>
        <thead><tr><th>Mesa</th><th>Aberta</th><th>Estado</th><th>Recebimento</th><th className="num">Total</th></tr></thead>
        <tbody>
          {d.bills.map((b) => (
            <tr key={b.id}>
              <td data-label="Mesa"><Link href={`/r/${slug}/admin/contas/${b.id}`}><strong>Mesa {b.tableLabel}</strong></Link></td>
              <td data-label="Aberta">{formatDateTime(b.createdAt)}</td>
              <td data-label="Estado"><StatusBadge meta={BILL_STATUS[b.status]} />{b.voidReason ? <div className={s.sub}>{b.voidReason}</div> : null}</td>
              <td data-label="Recebimento">{b.payment ? `${PAYMENT_METHOD[b.payment.method]} · ${formatDateTime(b.payment.recordedAt)}` : '—'}</td>
              <td data-label="Total" className="num">{formatEUR(b.totalCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {d.nextCursor ? <Link href={`?at=${encodeURIComponent(d.nextCursor.at)}&id=${d.nextCursor.id}`}>Mais antigas →</Link> : null}
    </div>
  );
}
