'use client';
import { useState } from 'react';
import { formatTime, elapsedMinutes } from '@/lib/time';
import { ConnectionBanner, ConnectionDot, useNow } from '@/lib/realtime/connection';
import { ticketColumn, padOrderNumber, LINE_STATUS } from '@/modules/orders/status';
import { Notice, Sheet } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { useNewItemSound, useStaffAction, useStaffSnapshot } from './useStaff';
import type { StationSnapshot, StationTicket } from './types';
import s from './staff.module.css';

type Col = 'new' | 'preparing' | 'ready';
const COLS: { id: Col; label: string; color: string }[] = [
  { id: 'new', label: 'Novo', color: '#6ea8fe' },
  { id: 'preparing', label: 'Em preparação', color: '#f2b544' },
  { id: 'ready', label: 'Pronto', color: '#37c16f' },
];

/** KDS: tickets by Novo / Em preparação / Pronto. Only this station's lines, no prices or guest data. */
export function StationPanel({ stationCode, stations }: { stationCode: string; stations: { code: string; name: string }[] }) {
  const snap = useStaffSnapshot<StationSnapshot>(['station', stationCode], `/snapshot?workspace=station&station=${stationCode}`);
  const action = useStaffAction();
  const now = useNow(1000) + snap.serverOffset;
  const [tab, setTab] = useState<Col>('new');
  const [sound, setSound] = useState(false);
  const [stock, setStock] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const data = snap.data;
  useNewItemSound(data?.tickets.map((t) => t.id) ?? [], sound);

  if (snap.isPending) return <div className={s.kds}><p style={{ padding: 20 }}>A carregar…</p></div>;
  if (!data) return <div className={s.page}><Notice tone="danger">Não foi possível carregar a estação.</Notice></div>;
  const disabled = !snap.canMutate;
  const target = data.station.targetMinutes;
  const byCol: Record<Col, StationTicket[]> = { new: [], preparing: [], ready: [] };
  for (const t of data.tickets) {
    const col = ticketColumn(t.lines.map((l) => l.status));
    if (col) byCol[col].push(t);
  }

  async function transition(id: string, lines: { id: string; version: number }[], target: 'preparing' | 'ready') {
    setMsg(null);
    const r = await action.run(id, '/items/transition', { items: lines.map((l) => ({ id: l.id, version: l.version })), targetState: target });
    if (!r.ok) setMsg(r.message);
  }

  return (
    <div className={s.kds}>
      <ConnectionBanner state={snap.conn} lastSuccessAt={snap.lastSuccessAt} onRetry={() => void snap.refetch()} />
      <div className={s.kdsHead}>
        <div>
          <div className={s.kdsTitle}>{data.station.name}</div>
          <div style={{ color: '#b9b5ab', fontSize: '0.9rem' }}>Prazo alvo {target} min · {data.tickets.length} ticket(s) ativo(s)</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          {stations.length > 1 ? (
            <nav aria-label="Estação" style={{ display: 'flex', gap: 6 }}>
              {stations.map((st) => <a key={st.code} href={`?estacao=${st.code}`} className={s.kGhost} aria-current={st.code === stationCode ? 'page' : undefined}>{st.name}</a>)}
            </nav>
          ) : null}
          <span style={{ color: '#d8d4ca' }}><ConnectionDot state={snap.conn} /></span>
          <button type="button" className={s.kGhost} onClick={() => setStock(true)}><Icon name="list" size={18} />Esgotar produto</button>
          <button type="button" className={s.kGhost} onClick={() => setSound((v) => !v)} aria-pressed={sound}>
            <Icon name={sound ? 'volume' : 'volumeOff'} size={18} />{sound ? 'Som ativo' : 'Ativar som'}
          </button>
          <span className={s.clock} aria-label="Hora">{formatTime(new Date(now))}</span>
        </div>
      </div>
      {msg ? <div style={{ padding: '10px 12px 0' }}><Notice tone="danger">{msg}</Notice></div> : null}
      <div className={s.kdsTabs} role="group" aria-label="Coluna">
        {COLS.map((c) => <button key={c.id} type="button" aria-pressed={tab === c.id} onClick={() => setTab(c.id)}>{c.label} ({byCol[c.id].length})</button>)}
      </div>
      <div className={s.kdsCols}>
        {COLS.map((c) => (
          <section key={c.id} className={`${s.kdsCol} ${tab !== c.id ? s.kdsHiddenMobile : ''}`} aria-labelledby={`k-${c.id}`}>
            <h2 id={`k-${c.id}`} className={s.kdsColHead} style={{ borderColor: c.color }}>{c.label}<span>{byCol[c.id].length}</span></h2>
            {byCol[c.id].length === 0 ? <p style={{ color: '#8f8b82', padding: '16px 4px' }}>Sem tickets.</p> : null}
            {byCol[c.id].map((t) => {
              const mins = elapsedMinutes(t.submittedAt, now);
              const late = mins > target && t.lines.some((l) => l.status === 'pending' || l.status === 'preparing');
              const pending = t.lines.filter((l) => l.status === 'pending');
              const preparing = t.lines.filter((l) => l.status === 'preparing');
              return (
                <article key={t.id} className={`${s.kTicket} ${late ? s.kTicketLate : ''}`} aria-label={`Mesa ${t.tableLabel}, pedido ${padOrderNumber(t.orderNumber)}`}>
                  <div className={s.kTicketHead}>
                    <span className={s.kTable}>Mesa {t.tableLabel}</span>
                    <span className={`${s.kTime} ${late ? s.kTimeLate : ''}`}>{mins} min{late ? ' · atraso' : ''}</span>
                  </div>
                  <div style={{ color: '#b9b5ab', fontSize: '0.9rem' }}>#{padOrderNumber(t.orderNumber)} · {formatTime(t.submittedAt)}</div>
                  {t.lines.map((l) => (
                    <div key={l.id} className={s.kLine}>
                      <span className={s.kQty}>{l.quantity}×</span>
                      <span>
                        <span className={s.kName}>{l.name}</span>
                        {l.note ? <span className={s.kNote}>⚠ {l.note}</span> : null}
                        <span className={s.kState} style={{ display: 'block', color: l.status === 'ready' ? '#37c16f' : l.status === 'preparing' ? '#f2b544' : '#9fc2ff' }}>
                          {LINE_STATUS[l.status].label}
                        </span>
                      </span>
                      <span>
                        {l.status === 'pending' && c.id !== 'new' ? (
                          <button type="button" className={`${s.kBtn} ${s.kBtnStart}`} disabled={disabled || action.pending !== null}
                            onClick={() => void transition(`start-${l.id}`, [l], 'preparing')}>Iniciar</button>
                        ) : null}
                        {l.status === 'preparing' ? (
                          <button type="button" className={`${s.kBtn} ${s.kBtnReady}`} disabled={disabled || action.pending !== null}
                            onClick={() => void transition(`ready-${l.id}`, [l], 'ready')}>Pronto</button>
                        ) : null}
                      </span>
                    </div>
                  ))}
                  {c.id === 'new' && pending.length ? (
                    <button type="button" className={`${s.kBtn} ${s.kBtnStart}`} disabled={disabled || action.pending !== null}
                      onClick={() => void transition(`start-${t.id}`, pending, 'preparing')}>Iniciar {pending.length > 1 ? `(${pending.length})` : ''}</button>
                  ) : null}
                  {preparing.length > 1 ? (
                    <button type="button" className={`${s.kBtn} ${s.kBtnReady}`} disabled={disabled || action.pending !== null}
                      onClick={() => void transition(`readyall-${t.id}`, preparing, 'ready')}>Tudo pronto ({preparing.length})</button>
                  ) : null}
                  {c.id === 'ready' ? <p style={{ color: '#b9b5ab' }}>A aguardar recolha pelo salão.</p> : null}
                </article>
              );
            })}
          </section>
        ))}
      </div>
      {data.recent.length ? (
        <details style={{ padding: '0 16px 24px', color: '#b9b5ab' }}>
          <summary style={{ minHeight: 44, cursor: 'pointer' }}>Histórico das últimas 2 horas ({data.recent.length})</summary>
          <ul style={{ listStyle: 'none', display: 'grid', gap: 4 }}>
            {data.recent.map((r, i) => <li key={i}>{formatTime(r.readyAt)} · Mesa {r.tableLabel} · {r.quantity}× {r.name} · {LINE_STATUS[r.status].label}</li>)}
          </ul>
        </details>
      ) : null}
      <StockSheet open={stock} onOpenChange={setStock} products={data.products} disabled={disabled} />
    </div>
  );
}

function StockSheet({ open, onOpenChange, products, disabled }: { open: boolean; onOpenChange: (o: boolean) => void; products: StationSnapshot['products']; disabled: boolean }) {
  const action = useStaffAction();
  const [err, setErr] = useState<string | null>(null);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Disponibilidade" description="Produtos desta estação. Esgotar afeta novos pedidos; tickets atuais continuam.">
      {err ? <Notice tone="danger">{err}</Notice> : null}
      <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
        {products.map((p) => (
          <label key={p.id} className={s.switchRow} style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--n-150)', padding: '6px 0' }}>
            <span>{p.name} <span className={s.sub}>{p.isAvailable ? 'disponível' : 'esgotado'}</span></span>
            <input type="checkbox" className={s.check} checked={p.isAvailable} disabled={disabled || action.pending !== null}
              aria-label={`${p.name} disponível`}
              onChange={async (e) => {
                const r = await action.run(`av-${p.id}`, `/menu/items/${p.id}/availability`, { available: e.target.checked, version: p.version }, 'PATCH');
                setErr(r.ok ? null : r.message);
              }} />
          </label>
        ))}
      </div>
    </Sheet>
  );
}
