import type { Metadata } from 'next';
import Link from 'next/link';
import { formatDateTime, formatDuration } from '@/lib/time';
import { CALL_STATUS, CALL_TYPE, type CallStatus, type CallType } from '@/modules/orders/status';
import { staffRpc } from '@/modules/auth/staff.server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import s from '@/components/staff/staff.module.css';

export const metadata: Metadata = { title: 'Chamados · Administração' };
type Row = { id: string; type: CallType; status: CallStatus; createdAt: string; tableLabel: string; claimedBy: string | null; waitSeconds: number | null; resolutionNote: string | null };

export default async function CallsPage({ params, searchParams }: { params: Promise<{ restaurantSlug: string }>; searchParams: Promise<{ at?: string; id?: string }> }) {
  const slug = (await params).restaurantSlug;
  const sp = await searchParams;
  const d = await staffRpc<{ calls: Row[]; nextCursor: { at: string; id: string } | null }>('staff_list_calls', { p_restaurant_slug: slug, p_cursor_at: sp.at ?? null, p_cursor_id: sp.id ?? null, p_limit: 50 });
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className={s.pageHead}><div><h1 className={s.h1}>Chamados</h1><p className={s.sub}>Histórico e pendências. A espera mede o tempo até alguém assumir.</p></div></div>
      <table className={s.table}>
        <thead><tr><th>Quando</th><th>Mesa</th><th>Motivo</th><th>Estado</th><th>Responsável</th><th className="num">Espera</th></tr></thead>
        <tbody>
          {d.calls.map((c) => (
            <tr key={c.id}>
              <td data-label="Quando">{formatDateTime(c.createdAt)}</td>
              <td data-label="Mesa">{c.tableLabel}</td>
              <td data-label="Motivo">{CALL_TYPE[c.type].label}</td>
              <td data-label="Estado"><StatusBadge meta={CALL_STATUS[c.status]} />{c.resolutionNote ? <div className={s.sub}>{c.resolutionNote}</div> : null}</td>
              <td data-label="Responsável">{c.claimedBy ?? '—'}</td>
              <td data-label="Espera" className="num">{c.waitSeconds === null ? '—' : formatDuration(c.waitSeconds)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {d.nextCursor ? <Link href={`?at=${encodeURIComponent(d.nextCursor.at)}&id=${d.nextCursor.id}`}>Mais antigos →</Link> : null}
    </div>
  );
}
