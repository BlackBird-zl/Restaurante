'use client';
import { useState } from 'react';
import { formatEUR } from '@/lib/money';
import { formatElapsed, formatTime } from '@/lib/time';
import { ConnectionBanner, ConnectionDot, useNow } from '@/lib/realtime/connection';
import { BILL_STATUS, LINE_STATUS, PAYMENT_METHOD, padOrderNumber, type PaymentMethod } from '@/modules/orders/status';
import { Button, ConfirmDialog, EmptyState, Notice, inputClass } from '@/components/ui/primitives';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useStaffAction, useStaffSnapshot } from './useStaff';
import type { CashierSnapshot, VisitDetail } from './types';
import s from './staff.module.css';

/** Caixa: conferência and external payment registration. The product never charges anything. */
export function CashierPanel() {
  const snap = useStaffSnapshot<CashierSnapshot>(['cashier'], '/snapshot?workspace=cashier');
  const now = useNow(5000) + snap.serverOffset;
  const [selected, setSelected] = useState<string | null>(null);
  const data = snap.data;
  if (snap.isPending) return <div className={s.page}><p className={s.muted}>A carregar a caixa…</p></div>;
  if (!data) return <div className={s.page}><Notice tone="danger">Não foi possível carregar a caixa.</Notice></div>;
  const requested = data.bills.filter((b) => b.status === 'requested');
  const open = data.bills.filter((b) => b.status === 'open');
  const current = selected ?? requested[0]?.id ?? null;

  return (
    <>
      <ConnectionBanner state={snap.conn} lastSuccessAt={snap.lastSuccessAt} onRetry={() => void snap.refetch()} />
      <div className={s.page}>
        <div className={s.pageHead}>
          <div>
            <h1 className={s.h1}>Caixa</h1>
            <p className={s.sub}>Recebimentos registados hoje (desde as 05:00): <strong className={s.money}>{formatEUR(data.receivedTodayCents)}</strong> · não é faturação fiscal</p>
          </div>
          <ConnectionDot state={snap.conn} />
        </div>
        <div className={`${s.cols} ${s.cols2}`}>
          <section className={s.col} aria-labelledby="h-bills">
            <div className={s.colHead}><h2 id="h-bills" className={s.h2}>Contas pedidas</h2><span className={s.count}>{requested.length}</span></div>
            {requested.length === 0 ? <div className={s.card}><EmptyState title="Nenhuma conta pedida" icon="receipt">As mesas que pedirem a conta aparecem aqui primeiro.</EmptyState></div> : null}
            {requested.map((b) => (
              <button key={b.id} type="button" className={s.tableTile} data-state="billing" onClick={() => setSelected(b.id)} aria-pressed={current === b.id}
                style={current === b.id ? { outline: '3px solid var(--n-900)' } : undefined}>
                <span style={{ display: 'flex', justifyContent: 'space-between' }}><strong className={s.tableLabel}>Mesa {b.tableLabel}</strong><span className={s.money}>{formatEUR(b.totalCents)}</span></span>
                <span className={s.sub}>Pedida há {b.requestedAt ? formatElapsed(b.requestedAt, now) : '—'}{b.pendingLines ? ` · ${b.pendingLines} item(ns) por entregar` : ' · tudo entregue'}</span>
              </button>
            ))}
            <div className={s.colHead} style={{ marginTop: 10 }}><h2 className={s.h2}>Mesas em atendimento</h2><span className={s.count}>{open.length}</span></div>
            <div className={s.tableGrid}>
              {open.map((b) => (
                <button key={b.id} type="button" className={s.tableTile} data-state="open" onClick={() => setSelected(b.id)}>
                  <strong className={s.tableLabel}>{b.tableLabel}</strong><span className={s.money}>{formatEUR(b.totalCents)}</span>
                </button>
              ))}
            </div>
            <div className={s.colHead} style={{ marginTop: 10 }}><h2 className={s.h2}>Recebidas hoje</h2></div>
            <div className={s.card}>
              {data.settledToday.length === 0 ? <p className={s.muted}>Ainda sem recebimentos hoje.</p> : data.settledToday.map((p) => (
                <div key={p.billId} className={s.row}><span>{formatTime(p.recordedAt)} · Mesa {p.tableLabel} · {PAYMENT_METHOD[p.method as PaymentMethod]} · {p.recordedBy}</span><span className={s.money}>{formatEUR(p.totalCents)}</span></div>
              ))}
            </div>
          </section>
          <section aria-label="Conferência">{current ? <BillReview billId={current} disabled={!snap.canMutate} onClosed={() => setSelected(null)} /> : <div className={s.card}><EmptyState title="Selecione uma conta" icon="receipt" /></div>}</section>
        </div>
      </div>
    </>
  );
}

function BillReview({ billId, disabled, onClosed }: { billId: string; disabled: boolean; onClosed: () => void }) {
  const q = useStaffSnapshot<VisitDetail & { snapshotLines: unknown[] }>(['bill', billId], `/bills/${billId}`);
  const action = useStaffAction();
  const [method, setMethod] = useState<PaymentMethod>('external_card');
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState('');
  const [reopen, setReopen] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'danger' | 'warn'; text: string } | null>(null);
  const d = q.data;
  if (!d) return <div className={s.card}><p className={s.muted}>A carregar a conta…</p></div>;
  const active = d.lines.filter((l) => l.status !== 'cancelled');
  const cancelled = d.lines.filter((l) => l.status === 'cancelled');
  const pending = active.filter((l) => l.status !== 'delivered');
  const canSettle = d.bill.status === 'requested' && pending.length === 0 && d.bill.totalCents > 0;
  const verb = method === 'cash' ? 'em numerário' : method === 'external_card' ? 'através do terminal externo' : 'por MB WAY (fora da aplicação)';

  async function settle() {
    const r = await action.run<{ payment: { amountCents: number } }>('settle', `/bills/${billId}/settle`,
      { version: d!.bill.version, expectedTotalCents: d!.bill.totalCents, method });
    setConfirm(false);
    if (r.ok) { setMsg({ tone: 'ok', text: `Recebimento de ${formatEUR(r.data.payment.amountCents)} registado. Mesa ${d!.visit.tableLabel} fechada e livre.` }); onClosed(); }
    else setMsg({ tone: 'danger', text: r.message });
  }

  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <div><div className={s.tableLabel}>Mesa {d.visit.tableLabel}</div><div className={s.meta}>Aberta às {formatTime(d.visit.openedAt)} · versão {d.bill.version}</div></div>
        <StatusBadge meta={BILL_STATUS[d.bill.status]} />
      </div>
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      <div>
        {active.map((l) => (
          <div key={l.id} className={s.row}>
            <span><strong className="tabular">{l.quantity}×</strong> {l.name} <span className={s.sub}>#{padOrderNumber(l.orderNumber)} · {formatEUR(l.unitPriceCents)}</span>
              {l.status !== 'delivered' ? <span style={{ marginLeft: 6 }}><StatusBadge meta={LINE_STATUS[l.status]} /></span> : null}</span>
            <span className={s.money}>{formatEUR(l.lineTotalCents)}</span>
          </div>
        ))}
        {cancelled.length ? <p className={s.sub} style={{ marginTop: 8 }}>Anulados (não contam):</p> : null}
        {cancelled.map((l) => (
          <div key={l.id} className={s.row} style={{ opacity: 0.7 }}>
            <span><s>{l.quantity}× {l.name}</s> <span className={s.sub}>{l.cancelReason}</span></span><span className={s.money}>0,00 €</span>
          </div>
        ))}
        <div className={s.row} style={{ borderTop: '2px solid var(--n-900)', paddingTop: 12 }}><strong style={{ fontSize: '1.15rem' }}>Total</strong><strong className={s.money} style={{ fontSize: '1.4rem' }}>{formatEUR(d.bill.totalCents)}</strong></div>
      </div>
      {pending.length ? <Notice tone="warn">{pending.length} item(ns) ainda por entregar. O recebimento só é possível quando tudo estiver entregue ou anulado.</Notice> : null}
      {d.bill.status === 'open' ? <Notice tone="info">A conta ainda não foi pedida. Peça a conta em nome da mesa para bloquear novos pedidos.</Notice> : null}
      {d.bill.status === 'requested' ? (
        <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 8 }}>
          <legend style={{ fontWeight: 700, marginBottom: 6 }}>Método (pagamento feito fora da aplicação)</legend>
          {(['external_card', 'cash', 'external_mbway'] as PaymentMethod[]).map((m) => (
            <label key={m} className={s.switchRow}><input type="radio" name={`m-${billId}`} className={s.check} checked={method === m} onChange={() => setMethod(m)} />{PAYMENT_METHOD[m]}</label>
          ))}
        </fieldset>
      ) : null}
      <div className={s.actions}>
        {d.bill.status === 'open' ? (
          <Button variant="primary" size="lg" disabled={disabled} loading={action.pending === 'request'}
            onClick={async () => { const r = await action.run('request', `/bills/${billId}/request`, { version: d.bill.version }); setMsg(r.ok ? null : { tone: 'danger', text: r.message }); }}>Pedir conta</Button>
        ) : null}
        {d.bill.status === 'requested' ? (
          <Button variant="success" size="xl" disabled={disabled || !canSettle} onClick={() => setConfirm(true)}>Registar recebimento e fechar</Button>
        ) : null}
        {d.bill.status === 'requested' ? <Button size="lg" variant="secondary" disabled={disabled} onClick={() => setReopen(true)}>Reabrir conta</Button> : null}
      </div>
      {reopen ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo da reabertura (ex.: querem sobremesa)" maxLength={200} />
          <div className={s.actions}>
            <Button variant="primary" disabled={reason.trim().length < 3} loading={action.pending === 'reopen'}
              onClick={async () => { const r = await action.run('reopen', `/bills/${billId}/reopen`, { version: d.bill.version, reason: reason.trim() }); if (r.ok) { setReopen(false); setMsg({ tone: 'ok', text: 'Conta reaberta: a mesa pode voltar a pedir.' }); } else setMsg({ tone: 'danger', text: r.message }); }}>Confirmar reabertura</Button>
            <Button variant="secondary" onClick={() => setReopen(false)}>Cancelar</Button>
          </div>
        </div>
      ) : null}
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} tone="success" loading={action.pending === 'settle'}
        title={`Recebeu ${formatEUR(d.bill.totalCents)} ${verb}?`} confirmLabel="Registar recebimento e fechar" onConfirm={() => void settle()}
        description="O registo é definitivo: fecha a mesa, revoga o acesso dos telemóveis e não pode ser editado. Não é uma fatura." />
    </div>
  );
}
