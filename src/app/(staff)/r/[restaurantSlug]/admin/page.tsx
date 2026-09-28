import type { Metadata } from 'next';
import Link from 'next/link';
import { formatEUR } from '@/lib/money';
import { staffRpc } from '@/modules/auth/staff.server';
import { Notice } from '@/components/ui/basic';
import s from '@/components/staff/staff.module.css';

export const metadata: Metadata = { title: 'Resumo · Administração' };

type Overview = {
  businessDate: string; orders: number; receivedCents: number; newCalls: number; lateLines: number;
  now: { activeVisits: number; freeTables: number; requestedBills: number; openConsumptionCents: number; readyAwaiting: { lines: number; units: number };
    activeCalls: { total: number; new: number; claimed: number }; lateLines: { lines: number; tables: string[] } };
  pending: { requestedBills: number; reservations: number; invitations: number; unavailableItems: string[]; draftPages: string[]; featuredMissing: number; orderingMode: string };
};

export default async function AdminHome({ params }: { params: Promise<{ restaurantSlug: string }> }) {
  const slug = (await params).restaurantSlug;
  const o = await staffRpc<Overview>('staff_admin_overview', { p_restaurant_slug: slug });
  const base = `/r/${slug}/admin`;
  const p = o.pending;
  const items: { text: string; href: string }[] = [];
  if (p.requestedBills) items.push({ text: `${p.requestedBills} conta(s) pedida(s) à espera da caixa`, href: `/r/${slug}/op/caixa` });
  if (p.reservations) items.push({ text: `${p.reservations} pedido(s) de reserva por confirmar`, href: `${base}/reservas` });
  if (p.invitations) items.push({ text: `${p.invitations} convite(s) de equipa pendente(s)`, href: `${base}/equipa` });
  if (p.unavailableItems.length) items.push({ text: `Esgotado: ${p.unavailableItems.join(', ')}`, href: `${base}/carta/produtos` });
  if (p.draftPages.length) items.push({ text: `Rascunhos por publicar: ${p.draftPages.join(', ')}`, href: `${base}/site` });
  if (p.featuredMissing) items.push({ text: `${p.featuredMissing} destaque(s) da Home apontam para produtos ocultos/arquivados`, href: `${base}/site` });
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className={s.pageHead}>
        <div><h1 className={s.h1}>Resumo</h1><p className={s.sub}>Hoje, desde as 05:00 ({o.businessDate}) · pedidos pela mesa {p.orderingMode === 'open' ? 'abertos' : p.orderingMode === 'paused' ? 'pausados' : 'fechados'}</p></div>
        <Link href={`${base}/analytics`} className={s.sub}>Ver analytics →</Link>
      </div>
      <div className={s.kpis}>
        <div className={s.kpi}><span className={s.kpiValue}>{o.orders}</span><span className={s.kpiLabel}>Pedidos submetidos</span></div>
        <div className={s.kpi}><span className={s.kpiValue}>{formatEUR(o.receivedCents)}</span><span className={s.kpiLabel}>Recebimentos registados</span><span className={s.kpiNote}>Não é faturação fiscal</span></div>
        <div className={s.kpi}><span className={s.kpiValue}>{o.newCalls}</span><span className={s.kpiLabel}>Chamados novos</span><span className={s.kpiNote}>{o.now.activeCalls.claimed} assumido(s)</span></div>
        <div className={s.kpi}><span className={s.kpiValue} style={o.lateLines ? { color: 'var(--st-late)' } : undefined}>{o.lateLines}</span><span className={s.kpiLabel}>Linhas atrasadas</span><span className={s.kpiNote}>{o.now.lateLines.tables.length ? `Mesa ${o.now.lateLines.tables.join(', ')}` : 'Nenhuma'}</span></div>
      </div>
      <div className={`${s.cols} ${s.cols2}`}>
        <section className={s.card} aria-labelledby="pend">
          <h2 id="pend" className={s.h2}>Pendências</h2>
          {items.length === 0 ? <p className={s.muted}>Nada pendente.</p> : (
            <ul style={{ listStyle: 'none', display: 'grid' }}>
              {items.map((i) => <li key={i.text} className={s.row}><span>{i.text}</span><Link href={i.href}>Abrir</Link></li>)}
            </ul>
          )}
        </section>
        <section className={s.card} aria-labelledby="agora">
          <h2 id="agora" className={s.h2}>Agora</h2>
          <div className={s.row}><span>Mesas ocupadas / livres</span><strong className="tabular">{o.now.activeVisits} / {o.now.freeTables}</strong></div>
          <div className={s.row}><span>Consumo em mesas abertas</span><strong className={s.money}>{formatEUR(o.now.openConsumptionCents)}</strong></div>
          <div className={s.row}><span>Prontos à espera de recolha</span><strong className="tabular">{o.now.readyAwaiting.lines} linha(s) · {o.now.readyAwaiting.units} un.</strong></div>
          <div className={s.row}><span>Chamados ativos</span><strong className="tabular">{o.now.activeCalls.total}</strong></div>
        </section>
      </div>
      <Notice tone="info">Os números são calculados a partir dos registos da base (pedidos, chamados e recebimentos). Consulte as definições em Analytics.</Notice>
    </div>
  );
}
