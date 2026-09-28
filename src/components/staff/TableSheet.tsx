'use client';
import { useState } from 'react';
import { formatEUR } from '@/lib/money';
import { formatTime } from '@/lib/time';
import { BILL_STATUS, LINE_STATUS, VISIT_STATE, padOrderNumber } from '@/modules/orders/status';
import { Button, Notice, Sheet, inputClass } from '@/components/ui/primitives';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useStaffAction, useStaffSnapshot } from './useStaff';
import { AssistedOrder } from './AssistedOrder';
import type { FloorSnapshot, VisitDetail, VisitLine } from './types';
import s from './staff.module.css';

/** Table drawer for salão: open visit + one-time code, detail, assisted order, cancel pending line, bill request. */
export function TableSheet({ tableId, floor, onClose, disabled }: { tableId: string | null; floor: FloorSnapshot; onClose: () => void; disabled: boolean }) {
  const table = floor.tables.find((t) => t.id === tableId);
  const action = useStaffAction();
  const [guests, setGuests] = useState('');
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'danger' | 'warn'; text: string } | null>(null);
  const [assisted, setAssisted] = useState(false);
  const [cancelLine, setCancelLine] = useState<VisitLine | null>(null);
  const [reason, setReason] = useState('');
  const visitId = table?.visit?.id ?? null;
  const detail = useStaffSnapshot<VisitDetail>(['visit', visitId ?? 'none'], `/visits/${visitId}`, { enabled: Boolean(visitId), interval: 4000 });

  function close() {
    setCode(null); setMsg(null); setAssisted(false); setCancelLine(null); setGuests('');
    onClose();
  }

  async function openVisit() {
    if (!table) return;
    setMsg(null);
    const r = await action.run<{ joinCode?: string; joinCodeUnavailable?: boolean; existing?: boolean; visit: { joinCodeExpiresAt: string } }>(
      'open', `/tables/${table.id}/visits`, guests ? { guestCount: Number(guests) } : {});
    if (!r.ok) { setMsg({ tone: 'danger', text: r.message }); return; }
    if (r.data.joinCode) setCode({ code: r.data.joinCode, expiresAt: r.data.visit.joinCodeExpiresAt });
    else setMsg({ tone: 'warn', text: 'A mesa já tinha um atendimento aberto. Gere um novo código se o grupo precisar.' });
  }
  async function rotate() {
    if (!visitId) return;
    const r = await action.run<{ joinCode?: string; visit: { joinCodeExpiresAt: string } }>('rotate', `/visits/${visitId}/join-code`, { expectedRevision: detail.data?.visit.revision });
    if (!r.ok) setMsg({ tone: 'danger', text: r.message });
    else if (r.data.joinCode) setCode({ code: r.data.joinCode, expiresAt: r.data.visit.joinCodeExpiresAt });
  }
  async function simple(id: string, path: string, body: unknown, okText: string) {
    const r = await action.run(id, path, body);
    setMsg(r.ok ? { tone: 'ok', text: okText } : { tone: 'danger', text: r.message });
    return r.ok;
  }

  const d = detail.data;
  const title = table ? `Mesa ${table.label}` : 'Mesa';
  return (
    <Sheet open={Boolean(tableId)} onOpenChange={(o) => { if (!o) close(); }} title={title}
      description={table ? `${table.zone} · ${table.seats} lugares · ${VISIT_STATE[table.state].label}` : undefined}>
      {!table ? null : code ? (
        <div style={{ display: 'grid', gap: 14 }}>
          <div className={s.codeBox} role="status" aria-live="polite">
            <span className={s.sub}>Código de atendimento</span>
            <span className={s.code}>{code.code.slice(0, 3)} {code.code.slice(3)}</span>
            <span className={s.sub}>Válido até às {formatTime(code.expiresAt)}. Mostrado só agora.</span>
          </div>
          <p className={s.sub}>Entregue o código apenas ao grupo sentado nesta mesa. Com o QR da mesa e este código, cada telemóvel pode pedir.</p>
          <Button variant="primary" size="lg" onClick={() => setCode(null)}>Feito</Button>
        </div>
      ) : assisted && visitId ? (
        <AssistedOrder visitId={visitId} tableLabel={table.label} onDone={(n) => { setAssisted(false); setMsg({ tone: 'ok', text: `Pedido ${padOrderNumber(n)} registado.` }); }} onCancel={() => setAssisted(false)} />
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
          {table.state === 'free' ? (
            <>
              <label style={{ display: 'grid', gap: 6 }}><span style={{ fontWeight: 600 }}>Pessoas (opcional)</span>
                <input className={inputClass} inputMode="numeric" value={guests} onChange={(e) => setGuests(e.target.value.replace(/\D/g, '').slice(0, 2))} />
              </label>
              <Button variant="primary" size="xl" disabled={disabled} loading={action.pending === 'open'} onClick={() => void openVisit()}>Abrir atendimento e gerar código</Button>
            </>
          ) : !d ? <p className={s.muted}>A carregar…</p> : (
            <>
              <div className={s.meta}>
                <span>Aberto às {formatTime(d.visit.openedAt)}</span>
                <StatusBadge meta={BILL_STATUS[d.bill.status]} />
                <span>{table.visit?.guestSessions ?? 0} dispositivo(s)</span>
              </div>
              <div className={s.card} style={{ boxShadow: 'none' }}>
                {d.lines.length === 0 ? <p className={s.muted}>Ainda sem pedidos.</p> : d.lines.map((l) => (
                  <div key={l.id} className={s.row} style={{ flexWrap: 'wrap' }}>
                    <span style={{ flex: '1 1 160px' }}>
                      <strong className="tabular">{l.quantity}×</strong> {l.name} <span className={s.pill}>{l.stationCode}</span>
                      <span className={s.sub} style={{ display: 'block' }}>#{padOrderNumber(l.orderNumber)} · {formatTime(l.submittedAt)}{l.note ? ` · Nota: ${l.note}` : ''}{l.cancelReason ? ` · Anulado: ${l.cancelReason}` : ''}</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <StatusBadge meta={LINE_STATUS[l.status]} />
                      <span className={s.money} style={l.status === 'cancelled' ? { textDecoration: 'line-through' } : undefined}>{formatEUR(l.quantity * l.unitPriceCents)}</span>
                      {l.status === 'pending' ? <Button size="md" variant="ghost" disabled={disabled} onClick={() => { setCancelLine(l); setReason(''); }}>Anular</Button> : null}
                    </span>
                  </div>
                ))}
                <div className={s.row}><strong>Total</strong><strong className={s.money}>{formatEUR(d.bill.totalCents)}</strong></div>
              </div>
              {cancelLine ? (
                <div className={s.card} style={{ boxShadow: 'none' }}>
                  <p><strong>Anular {cancelLine.quantity}× {cancelLine.name}?</strong> Ainda não foi iniciado. Fica registado com o motivo.</p>
                  <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (ex.: cliente mudou de ideias)" maxLength={200} />
                  <div className={s.actions}>
                    <Button variant="danger" disabled={reason.trim().length < 3 || disabled} loading={action.pending === 'cancel'}
                      onClick={async () => { if (await simple('cancel', `/items/${cancelLine.id}/cancel`, { version: cancelLine.version, reason: reason.trim() }, 'Linha anulada.')) setCancelLine(null); }}>Anular linha</Button>
                    <Button variant="secondary" onClick={() => setCancelLine(null)}>Voltar</Button>
                  </div>
                </div>
              ) : null}
              <div className={s.actions}>
                {d.visit.status === 'open' ? <Button variant="primary" size="lg" disabled={disabled} onClick={() => setAssisted(true)} icon="plus">Pedido assistido</Button> : null}
                {d.visit.status === 'open' ? <Button size="lg" variant="secondary" disabled={disabled} loading={action.pending === 'rotate'} onClick={() => void rotate()}>Novo código</Button> : null}
                {d.bill.status === 'open' && d.lines.some((l) => l.status !== 'cancelled') ? (
                  <Button size="lg" variant="secondary" disabled={disabled} loading={action.pending === 'bill'}
                    onClick={() => void simple('bill', `/bills/${d.bill.id}/request`, { version: d.bill.version }, 'Conta pedida. A caixa já vê a mesa.')}>Pedir conta</Button>
                ) : null}
                {d.bill.status !== 'settled' && d.lines.every((l) => l.status === 'cancelled') ? (
                  <Button size="lg" variant="secondary" disabled={disabled} loading={action.pending === 'void'}
                    onClick={() => void simple('void', `/bills/${d.bill.id}/void`, { version: d.bill.version, reason: 'Mesa sem consumo' }, 'Mesa libertada sem consumo.')}>Fechar sem consumo</Button>
                ) : null}
                <Button size="lg" variant="ghost" disabled={disabled} loading={action.pending === 'revoke'}
                  onClick={() => void simple('revoke', `/visits/${d.visit.id}/revoke-sessions`, {}, 'Dispositivos desligados. Gere um novo código se necessário.')}>Desligar dispositivos</Button>
              </div>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}
