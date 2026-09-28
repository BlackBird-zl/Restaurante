import type { Metadata } from 'next';
import Link from 'next/link';
import { formatEUR } from '@/lib/money';
import { formatDateTime } from '@/lib/time';
import { BILL_STATUS, PAYMENT_METHOD, type PaymentMethod } from '@/modules/orders/status';
import { staffRpc } from '@/modules/auth/staff.server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { VisitDetail } from '@/components/staff/types';
import s from '@/components/staff/staff.module.css';

export const metadata: Metadata = { title: 'Conta · Administração' };
type Detail = VisitDetail & { snapshotLines: { name: string; quantity: number; unitPriceCents: number; lineTotalCents: number; cancelled: boolean }[] };

export default async function BillDetail({ params }: { params: Promise<{ restaurantSlug: string; billId: string }> }) {
  const p = await params;
  const d = await staffRpc<Detail>('staff_get_bill', { p_restaurant_slug: p.restaurantSlug, p_bill_id: p.billId });
  const lines = d.snapshotLines.length ? d.snapshotLines : d.lines.map((l) => ({ name: l.name, quantity: l.quantity, unitPriceCents: l.unitPriceCents, lineTotalCents: l.lineTotalCents, cancelled: l.status === 'cancelled' }));
  return (
    <div style={{ display: 'grid', gap: 14, maxWidth: 820 }}>
      <p className={s.sub}><Link href={`/r/${p.restaurantSlug}/admin/contas`}>Contas</Link> / Mesa {d.visit.tableLabel}</p>
      <div className={s.pageHead}><h1 className={s.h1}>Conta · Mesa {d.visit.tableLabel}</h1><StatusBadge meta={BILL_STATUS[d.bill.status]} /></div>
      <p className={s.sub}>Aberta {formatDateTime(d.visit.openedAt)}{d.visit.closedAt ? ` · fechada ${formatDateTime(d.visit.closedAt)}` : ''} · {d.snapshotLines.length ? 'linhas congeladas no fecho (snapshot)' : 'conta em curso'}</p>
      <table className={s.table}>
        <thead><tr><th>Linha</th><th className="num">Unit.</th><th className="num">Total</th></tr></thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} style={l.cancelled ? { opacity: 0.6 } : undefined}>
              <td data-label="Linha">{l.cancelled ? <s>{l.quantity}× {l.name}</s> : `${l.quantity}× ${l.name}`}{l.cancelled ? ' (anulado)' : ''}</td>
              <td data-label="Unit." className="num">{formatEUR(l.unitPriceCents)}</td>
              <td data-label="Total" className="num">{formatEUR(l.lineTotalCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ textAlign: 'right', fontSize: '1.2rem' }}><strong>Total {formatEUR(d.bill.totalCents)}</strong></p>
      {d.payment ? <div className={s.card}>Recebimento registado: <strong>{formatEUR(d.payment.amountCents)}</strong> · {PAYMENT_METHOD[d.payment.method as PaymentMethod]} · {formatDateTime(d.payment.recordedAt)} · por {d.payment.recordedBy}. Registo imutável; correções são tratadas no processo financeiro externo.</div> : null}
    </div>
  );
}
