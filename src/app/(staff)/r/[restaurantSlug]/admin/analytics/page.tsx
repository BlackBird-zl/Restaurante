import type { Metadata } from 'next';
import Link from 'next/link';
import { formatEUR } from '@/lib/money';
import { formatDuration, localToday } from '@/lib/time';
import { CALL_TYPE, PAYMENT_METHOD, type CallType, type PaymentMethod } from '@/modules/orders/status';
import { staffRpc } from '@/modules/auth/staff.server';
import { Notice } from '@/components/ui/basic';
import s from '@/components/staff/staff.module.css';

export const metadata: Metadata = { title: 'Analytics · Administração' };

type A = {
  businessDates: { from: string; to: string; today: string }; businessDayStart: string;
  orders: { submitted: number; fullyCancelled: number; lines: number; unitsOrdered: number; orderedValueCents: number };
  received: { totalCents: number; count: number; byMethod: Record<string, number> };
  calls: { total: number; byType: Record<string, number>; claimWait: { n: number; avgSeconds: number | null } };
  preparation: { stationCode: string; stationName: string; targetMinutes: number; n: number; avgPrepSeconds: number | null; waitN: number; avgWaitSeconds: number | null }[];
  topProducts: { menuItemId: string; name: string; units: number; orderedValueCents: number }[];
  hours: { hour: number; orders: number }[];
  tables: { label: string; orders: number; calls: number; settledBills: number }[];
  now: { lateLines: { lines: number; tables: string[] }; activeCalls: { total: number } };
};

function addDays(ymd: string, n: number) {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export default async function AnalyticsPage({ params, searchParams }: { params: Promise<{ restaurantSlug: string }>; searchParams: Promise<{ p?: string; de?: string; ate?: string }> }) {
  const slug = (await params).restaurantSlug;
  const sp = await searchParams;
  const today = localToday();
  const period = sp.p ?? 'hoje';
  let from: string | null = null;
  let to: string | null = null;
  if (period === '7') { from = addDays(today, -6); to = today; }
  else if (period === '30') { from = addDays(today, -29); to = today; }
  else if (period === 'custom' && sp.de && sp.ate) { from = sp.de; to = sp.ate; }
  let a: A | null = null;
  let error: string | null = null;
  try {
    a = await staffRpc<A>('staff_get_analytics', { p_restaurant_slug: slug, p_from: from, p_to: to });
  } catch {
    error = 'Intervalo inválido: escolha no máximo 90 dias, com a data final depois da inicial.';
  }
  const base = `/r/${slug}/admin/analytics`;
  const maxHour = Math.max(1, ...(a?.hours.map((h) => h.orders) ?? [1]));
  const maxUnits = Math.max(1, ...(a?.topProducts.map((p) => p.units) ?? [1]));
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className={s.pageHead}>
        <div><h1 className={s.h1}>Analytics</h1>
          <p className={s.sub}>{a ? (a.businessDates.from === a.businessDates.to ? `Dia operacional ${a.businessDates.from} (desde as ${a.businessDayStart})` : `${a.businessDates.from} a ${a.businessDates.to}`) : ''} · derivado dos registos reais</p></div>
        <nav className={s.toolbar} aria-label="Período">
          {[['hoje', 'Hoje'], ['7', '7 dias'], ['30', '30 dias']].map(([k, l]) => (
            <Link key={k} href={`${base}?p=${k}`} className={s.pill} aria-current={period === k ? 'page' : undefined} style={period === k ? { background: 'var(--n-900)', color: '#fff' } : undefined}>{l}</Link>
          ))}
          <form action={base} className={s.toolbar}>
            <input type="hidden" name="p" value="custom" />
            <label className="sr-only" htmlFor="de">De</label><input id="de" type="date" name="de" defaultValue={sp.de} style={{ minHeight: 36 }} />
            <label className="sr-only" htmlFor="ate">Até</label><input id="ate" type="date" name="ate" defaultValue={sp.ate} style={{ minHeight: 36 }} />
            <button type="submit" style={{ minHeight: 36 }}>Aplicar (máx. 90 dias)</button>
          </form>
        </nav>
      </div>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {a ? <>
        <div className={s.kpis}>
          <div className={s.kpi}><span className={s.kpiValue}>{a.orders.submitted}</span><span className={s.kpiLabel}>Pedidos submetidos</span>
            <span className={s.kpiNote}>{a.orders.unitsOrdered} unidades · {a.orders.fullyCancelled} totalmente anulado(s)</span></div>
          <div className={s.kpi}><span className={s.kpiValue}>{formatEUR(a.received.totalCents)}</span><span className={s.kpiLabel}>Recebimentos registados</span>
            <span className={s.kpiNote}>{a.received.count} conta(s) · {Object.entries(a.received.byMethod).map(([m, c]) => `${PAYMENT_METHOD[m as PaymentMethod]} ${formatEUR(c)}`).join(' · ') || 'nenhum'}</span></div>
          <div className={s.kpi}><span className={s.kpiValue}>{a.calls.total}</span><span className={s.kpiLabel}>Chamados</span>
            <span className={s.kpiNote}>{Object.entries(a.calls.byType).map(([t, n]) => `${CALL_TYPE[t as CallType].label} ${n}`).join(' · ') || 'nenhum'}</span></div>
          <div className={s.kpi}><span className={s.kpiValue}>{formatDuration(a.calls.claimWait.avgSeconds)}</span><span className={s.kpiLabel}>Espera até assumir</span>
            <span className={s.kpiNote}>{a.calls.claimWait.n ? `média de ${a.calls.claimWait.n} chamado(s)` : 'sem amostra'}</span></div>
        </div>
        <section className={s.card} aria-labelledby="prep">
          <h2 id="prep" className={s.h2}>Preparação por estação</h2>
          <table className={s.table}>
            <thead><tr><th>Estação</th><th className="num">Preparação média</th><th className="num">Linhas (n)</th><th className="num">Espera até iniciar</th><th className="num">Prazo alvo</th></tr></thead>
            <tbody>{a.preparation.map((p) => (
              <tr key={p.stationCode}><td data-label="Estação">{p.stationName} ({p.stationCode})</td><td data-label="Preparação" className="num">{formatDuration(p.avgPrepSeconds)}</td>
                <td data-label="n" className="num">{p.n}</td><td data-label="Espera" className="num">{formatDuration(p.avgWaitSeconds)}</td><td data-label="Prazo" className="num">{p.targetMinutes} min</td></tr>
            ))}</tbody>
          </table>
          <p className={s.sub}>Em atraso agora: <strong>{a.now.lateLines.lines}</strong> linha(s){a.now.lateLines.tables.length ? ` (Mesa ${a.now.lateLines.tables.join(', ')})` : ''}.</p>
        </section>
        <div className={`${s.cols} ${s.cols2}`}>
          <section className={s.card} aria-labelledby="hrs">
            <h2 id="hrs" className={s.h2}>Pedidos por hora (hora local)</h2>
            <div className={s.bars} role="img" aria-label="Pedidos por hora; detalhe na tabela abaixo">
              {a.hours.map((h) => (
                <div key={h.hour} className={`${s.bar} ${h.orders === 0 ? s.barZero : ''}`} style={{ height: `${Math.max(2, (h.orders / maxHour) * 100)}%` }}
                  title={`${String(h.hour).padStart(2, '0')}h: ${h.orders} pedido(s)`} />
              ))}
            </div>
            <div className={s.barLabels} aria-hidden>{a.hours.map((h) => <span key={h.hour}>{h.hour % 3 === 0 ? h.hour : ''}</span>)}</div>
            <details><summary className={s.sub} style={{ minHeight: 40, cursor: 'pointer' }}>Ver tabela</summary>
              <table className={s.table}><tbody>{a.hours.filter((h) => h.orders > 0).map((h) => <tr key={h.hour}><td>{String(h.hour).padStart(2, '0')}:00</td><td className="num">{h.orders}</td></tr>)}</tbody></table>
              {a.hours.every((h) => h.orders === 0) ? <p className={s.muted}>Zero pedidos no período.</p> : null}
            </details>
          </section>
          <section className={s.card} aria-labelledby="top">
            <h2 id="top" className={s.h2}>Produtos mais pedidos</h2>
            {a.topProducts.length === 0 ? <p className={s.muted}>Sem dados no período.</p> : a.topProducts.map((p) => (
              <div key={p.menuItemId} style={{ display: 'grid', gap: 4, padding: '6px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>{p.name}</span><span className="tabular">{p.units} un. · {formatEUR(p.orderedValueCents)} pedidos</span></div>
                <div className={s.hbar} style={{ width: `${(p.units / maxUnits) * 100}%` }} aria-hidden />
              </div>
            ))}
            <p className={s.sub}>Valor pedido ≠ receita recebida.</p>
          </section>
        </div>
        <section className={s.card} aria-labelledby="tbl">
          <h2 id="tbl" className={s.h2}>Mesas com atividade</h2>
          <table className={s.table}>
            <thead><tr><th>Mesa</th><th className="num">Pedidos</th><th className="num">Chamados</th><th className="num">Contas recebidas</th></tr></thead>
            <tbody>{a.tables.filter((t) => t.orders || t.calls || t.settledBills).map((t) => (
              <tr key={t.label}><td data-label="Mesa">{t.label}</td><td data-label="Pedidos" className="num">{t.orders}</td><td data-label="Chamados" className="num">{t.calls}</td><td data-label="Contas" className="num">{t.settledBills}</td></tr>
            ))}</tbody>
          </table>
        </section>
        <section className={s.card} aria-labelledby="def">
          <h2 id="def" className={s.h2}>Definições</h2>
          <ul style={{ paddingLeft: 18, display: 'grid', gap: 6 }} className={s.sub}>
            <li>Dia operacional = data local (Europe/Lisbon) menos {a.businessDayStart}; os limites UTC respeitam mudanças de hora.</li>
            <li>Pedidos submetidos: contagem de pedidos pelo momento de envio. Recebimentos registados: soma dos pagamentos marcados pela caixa, pelo momento do registo; exclui contas abertas e anuladas. Não é faturação fiscal.</li>
            <li>Espera até assumir: média (primeira assunção − criação) dos chamados assumidos. Preparação: média (pronto − início) por linha não anulada, não por unidade.</li>
            <li>Em atraso: linhas pendentes ou em preparação há mais tempo do que o prazo alvo da estação. Sem amostra → “Sem dados”.</li>
          </ul>
        </section>
      </> : null}
    </div>
  );
}
