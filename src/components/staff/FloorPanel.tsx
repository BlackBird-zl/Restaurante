'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatEUR } from '@/lib/money';
import { formatElapsed, formatTime } from '@/lib/time';
import { ConnectionBanner, ConnectionDot, useNow } from '@/lib/realtime/connection';
import { CALL_STATUS, CALL_TYPE, VISIT_STATE } from '@/modules/orders/status';
import { Button, EmptyState, Notice, Sheet, inputClass } from '@/components/ui/primitives';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import { useNewItemSound, useStaffAction, useStaffSnapshot } from './useStaff';
import { useStaffRT } from './StaffRealtime';
import { TableSheet } from './TableSheet';
import type { FloorCall, FloorSnapshot, ReadyItem } from './types';
import s from './staff.module.css';

type Tab = 'tasks' | 'ready' | 'tables';

export function FloorPanel() {
  const rt = useStaffRT();
  const snap = useStaffSnapshot<FloorSnapshot>(['floor'], '/snapshot?workspace=floor');
  const action = useStaffAction();
  const now = useNow(1000) + snap.serverOffset;
  const [tab, setTab] = useState<Tab>('tasks');
  const [sound, setSound] = useState(false);
  const [openTable, setOpenTable] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'danger' | 'warn'; text: string } | null>(null);
  const [reassign, setReassign] = useState<{ kind: 'call'; call: FloorCall } | { kind: 'delivery'; items: ReadyItem[] } | null>(null);
  const data = snap.data;

  useNewItemSound([...(data?.calls.map((c) => c.id) ?? []), ...(data?.readyItems.filter((r) => r.status === 'ready').map((r) => r.id) ?? [])], sound);

  const readyByTable = useMemo(() => {
    const m = new Map<string, ReadyItem[]>();
    for (const r of data?.readyItems ?? []) m.set(r.tableLabel, [...(m.get(r.tableLabel) ?? []), r]);
    return [...m.entries()];
  }, [data?.readyItems]);

  async function act(id: string, path: string, body: unknown, okText?: string) {
    setMessage(null);
    const r = await action.run(id, path, body);
    if (!r.ok) setMessage({ tone: 'danger', text: r.message });
    else if (okText) setMessage({ tone: 'ok', text: okText });
    return r;
  }

  if (snap.isPending) return <div className={s.page}><p className={s.muted}>A carregar o salão…</p></div>;
  if (!data) return <div className={s.page}><Notice tone="danger">Não foi possível carregar o salão. <Button onClick={() => void snap.refetch()}>Tentar de novo</Button></Notice></div>;
  const disabled = !snap.canMutate;
  const newCalls = data.calls.filter((c) => c.status === 'new').length;
  const readyCount = data.readyItems.filter((r) => r.status === 'ready').length;

  return (
    <>
      <ConnectionBanner state={snap.conn} lastSuccessAt={snap.lastSuccessAt} onRetry={() => void snap.refetch()} />
      <div className={s.page}>
        <div className={s.pageHead}>
          <div>
            <h1 className={s.h1}>Salão</h1>
            <p className={s.sub}>{data.me.displayName} · {formatTime(new Date(now))} · Pedidos pela mesa: {data.orderingMode === 'open' ? 'abertos' : data.orderingMode === 'paused' ? 'pausados' : 'fechados'}</p>
          </div>
          <div className={s.toolbar}>
            <ConnectionDot state={snap.conn} />
            <Button size="md" variant="secondary" icon={sound ? 'volume' : 'volumeOff'} onClick={() => setSound((v) => !v)} aria-pressed={sound}>
              {sound ? 'Som ativo' : 'Ativar som'}
            </Button>
          </div>
        </div>
        {message ? <div style={{ marginBottom: 12 }}><Notice tone={message.tone}>{message.text}</Notice></div> : null}

        <div className={s.mobileTabs} role="group" aria-label="Vista">
          <button type="button" aria-pressed={tab === 'tasks'} onClick={() => setTab('tasks')}>Chamados {newCalls ? <span className={s.count}>{newCalls}</span> : null}</button>
          <button type="button" aria-pressed={tab === 'ready'} onClick={() => setTab('ready')}>Prontos {readyCount ? <span className={s.count}>{readyCount}</span> : null}</button>
          <button type="button" aria-pressed={tab === 'tables'} onClick={() => setTab('tables')}>Mesas</button>
        </div>

        <div className={`${s.cols} ${s.cols3}`}>
          {/* ------------------------------ Calls ------------------------------ */}
          <section className={`${s.col} ${tab !== 'tasks' ? s.mobileHidden : ''}`} aria-labelledby="h-calls">
            <div className={s.colHead}><h2 id="h-calls" className={s.h2}>Chamados</h2><span className={s.count}>{data.calls.length}</span></div>
            {data.calls.length === 0 ? <div className={s.card}><EmptyState title="Sem chamados ativos" icon="bell">Os novos chamados das mesas aparecem aqui.</EmptyState></div> : null}
            {data.calls.map((c) => (
              <article key={c.id} className={s.card} aria-label={`Mesa ${c.tableLabel}: ${CALL_TYPE[c.type].label}`}>
                <div className={s.cardHead}>
                  <div>
                    <div className={s.tableLabel}>Mesa {c.tableLabel}</div>
                    <div className={s.meta}><Icon name={CALL_TYPE[c.type].icon} size={16} /><strong>{CALL_TYPE[c.type].label}</strong> · há {formatElapsed(c.createdAt, now)}</div>
                  </div>
                  <StatusBadge meta={CALL_STATUS[c.status]} />
                </div>
                {c.status === 'claimed' ? <p className={s.owner}>{c.claimedByMe ? 'Assumido por si' : `${c.claimedBy} está a tratar`}</p> : null}
                <div className={s.actions}>
                  {c.status === 'new' ? (
                    <Button variant="primary" size="lg" disabled={disabled} loading={action.pending === `claim-${c.id}`}
                      onClick={() => void act(`claim-${c.id}`, `/calls/${c.id}/claim`, { version: c.version })}>Assumir</Button>
                  ) : null}
                  {c.status === 'claimed' && c.claimedByMe ? (
                    <Button variant="success" size="lg" disabled={disabled} loading={action.pending === `done-${c.id}`}
                      onClick={() => void act(`done-${c.id}`, `/calls/${c.id}/resolve`, { version: c.version, outcome: 'completed' })}>Concluir</Button>
                  ) : null}
                  {c.status === 'claimed' ? (
                    <Button size="lg" variant="secondary" disabled={disabled} onClick={() => setReassign({ kind: 'call', call: c })}>Reatribuir</Button>
                  ) : null}
                  {c.type === 'bill' ? <Button size="lg" variant="ghost" onClick={() => setOpenTable(data.tables.find((t) => t.label === c.tableLabel)?.id ?? null)}>Ver conta</Button> : null}
                </div>
              </article>
            ))}
            {data.reservationsToday.length || data.pendingReservations ? (
              <div className={s.card}>
                <div className={s.cardHead}><h2 className={s.h2}>Reservas de hoje</h2><Link href={`/r/${rt.slug}/admin/reservas`} className={s.sub}>{data.pendingReservations} por confirmar</Link></div>
                {data.reservationsToday.map((r) => (
                  <div key={r.id} className={s.row}><span><strong className="tabular">{formatTime(r.scheduledAt)}</strong> · {r.name} · {r.partySize} pax</span><span className={s.pill}>{r.status === 'confirmed' ? 'Confirmada' : 'Por confirmar'}</span></div>
                ))}
              </div>
            ) : null}
          </section>

          {/* ------------------------------ Ready queue ------------------------------ */}
          <section className={`${s.col} ${tab !== 'ready' ? s.mobileHidden : ''}`} aria-labelledby="h-ready">
            <div className={s.colHead}><h2 id="h-ready" className={s.h2}>Prontos para levar</h2><span className={s.count}>{readyCount}</span></div>
            {readyByTable.length === 0 ? <div className={s.card}><EmptyState title="Nada pronto neste momento" icon="check">Quando a cozinha ou o bar marcarem itens como prontos, aparecem aqui.</EmptyState></div> : null}
            {readyByTable.map(([label, items]) => {
              const ready = items.filter((i) => i.status === 'ready');
              const mine = items.filter((i) => i.status === 'delivering' && i.mine);
              const others = items.filter((i) => i.status === 'delivering' && !i.mine);
              return (
                <article key={label} className={s.card} aria-label={`Mesa ${label}`}>
                  <div className={s.cardHead}><div className={s.tableLabel}>Mesa {label}</div><span className={s.sub}>{items.length} linha(s)</span></div>
                  {items.map((i) => (
                    <div key={i.id} className={s.row}>
                      <span><strong className="tabular">{i.quantity}×</strong> {i.name} <span className={s.pill}>{i.stationCode}</span>
                        {i.note ? <span className={s.muted} style={{ display: 'block', fontSize: '0.85rem' }}>Nota: {i.note}</span> : null}</span>
                      <span className={s.sub}>{i.status === 'ready' ? `pronto há ${formatElapsed(i.readyAt, now)}` : i.mine ? 'a levar (eu)' : `${i.deliveryMemberName} a levar`}</span>
                    </div>
                  ))}
                  <div className={s.actions}>
                    {ready.length ? (
                      <Button variant="primary" size="lg" disabled={disabled} loading={action.pending === `take-${label}`}
                        onClick={() => void act(`take-${label}`, '/items/transition', { targetState: 'delivering', items: ready.map((i) => ({ id: i.id, version: i.version })) })}>
                        Vou levar ({ready.reduce((a, i) => a + i.quantity, 0)})
                      </Button>
                    ) : null}
                    {mine.length ? (
                      <Button variant="success" size="lg" disabled={disabled} loading={action.pending === `deliver-${label}`}
                        onClick={() => void act(`deliver-${label}`, '/items/transition', { targetState: 'delivered', items: mine.map((i) => ({ id: i.id, version: i.version })) })}>
                        Entregue
                      </Button>
                    ) : null}
                    {others.length ? <Button size="lg" variant="secondary" disabled={disabled} onClick={() => setReassign({ kind: 'delivery', items: others })}>Reatribuir entrega</Button> : null}
                  </div>
                </article>
              );
            })}
          </section>

          {/* ------------------------------ Tables ------------------------------ */}
          <section className={`${s.col} ${tab !== 'tables' ? s.mobileHidden : ''}`} aria-labelledby="h-tables">
            <div className={s.colHead}><h2 id="h-tables" className={s.h2}>Mesas</h2>
              <span className={s.sub}>{data.tables.filter((t) => t.state === 'free').length} livres · {data.tables.filter((t) => t.state !== 'free').length} ocupadas</span></div>
            <div className={s.tableGrid}>
              {data.tables.map((t) => (
                <button key={t.id} type="button" className={s.tableTile} data-state={t.state} onClick={() => setOpenTable(t.id)}
                  aria-label={`Mesa ${t.label}, ${VISIT_STATE[t.state].label}`}>
                  <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <strong className={s.tableLabel}>{t.label}</strong><span className={s.sub}>{t.zone} · {t.seats}</span>
                  </span>
                  <StatusBadge meta={VISIT_STATE[t.state]} />
                  {t.visit ? (
                    <span className={s.sub}>
                      <span className={s.money}>{formatEUR(t.visit.totalCents)}</span>
                      {t.visit.pendingLines ? ` · ${t.visit.pendingLines} em curso` : ''}{t.visit.activeCalls ? ` · ${t.visit.activeCalls} chamado(s)` : ''}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      <TableSheet tableId={openTable} floor={data} onClose={() => setOpenTable(null)} disabled={disabled} />

      <ReassignSheet target={reassign} members={data.members} meId={data.me.memberId} onClose={() => setReassign(null)}
        onSubmit={async (memberId, reason) => {
          if (!reassign) return;
          const r = reassign.kind === 'call'
            ? await act('reassign', `/calls/${reassign.call.id}/reassign`, { version: reassign.call.version, memberId, reason }, 'Tarefa reatribuída.')
            : await act('reassign', '/deliveries/reassign', { items: reassign.items.map((i) => ({ id: i.id, version: i.version })), memberId, reason }, 'Entrega reatribuída.');
          if (r.ok) setReassign(null);
        }} pending={action.pending === 'reassign'} />
    </>
  );
}

function ReassignSheet({ target, members, meId, onClose, onSubmit, pending }: {
  target: unknown; members: { id: string; displayName: string }[]; meId: string; onClose: () => void;
  onSubmit: (memberId: string, reason: string) => Promise<void>; pending: boolean;
}) {
  const [memberId, setMemberId] = useState('');
  const [reason, setReason] = useState('');
  return (
    <Sheet open={Boolean(target)} onOpenChange={(o) => { if (!o) onClose(); }} title="Reatribuir" description="A reatribuição fica registada com o motivo.">
      <div style={{ display: 'grid', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}><span style={{ fontWeight: 600 }}>Para</span>
          <select className={inputClass} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">Escolher</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.displayName}{m.id === meId ? ' (eu)' : ''}</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 6 }}><span style={{ fontWeight: 600 }}>Motivo</span>
          <input className={inputClass} value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: troca de zona" />
        </label>
        <Button variant="primary" size="lg" disabled={!memberId || reason.trim().length < 3} loading={pending} onClick={() => void onSubmit(memberId, reason.trim())}>Reatribuir</Button>
      </div>
    </Sheet>
  );
}
