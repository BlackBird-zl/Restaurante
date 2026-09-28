'use client';
import { useState } from 'react';
import { formatDateTime } from '@/lib/time';
import { RESERVATION_STATUS, type ReservationStatus } from '@/modules/orders/status';
import { Button, Notice, inputClass } from '@/components/ui/primitives';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAdminAction } from './useAdmin';
import s from '../staff.module.css';

type Resv = { id: string; reference: string; name: string | null; email: string | null; phone: string | null; partySize: number; localDate: string; localTime: string;
  status: ReservationStatus; note: string | null; internalNote: string | null; contactedAt: string | null; version: number; createdAt: string; anonymized: boolean; handledBy: string | null };

/** Human confirmation only: confirming requires stating that contact was made. No messages are sent by the system. */
export function ReservationsManager({ reservations, isDemo }: { reservations: Resv[]; isDemo: boolean }) {
  const { act, pending, feedback } = useAdminAction();
  const [open, setOpen] = useState<string | null>(null);
  const [contact, setContact] = useState(false);
  const [note, setNote] = useState('');
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className={s.pageHead}><div><h1 className={s.h1}>Reservas</h1><p className={s.sub}>Pedidos sujeitos a confirmação humana. “Confirmada” significa que a equipa contactou o cliente — o sistema não envia mensagens.</p></div></div>
      {isDemo ? <Notice tone="info">Restaurante de demonstração: os pedidos são simulações com dados fictícios.</Notice> : null}
      {feedback ? <Notice tone={feedback.tone === 'info' ? 'info' : feedback.tone}>{feedback.text}</Notice> : null}
      {reservations.length === 0 ? <p className={s.muted}>Sem pedidos de reserva neste período.</p> : null}
      {reservations.map((r) => (
        <article key={r.id} className={s.card}>
          <div className={s.cardHead}>
            <div>
              <strong style={{ fontSize: '1.1rem' }}>{r.localDate} · {r.localTime} · {r.partySize} pessoa(s)</strong>
              <div className={s.meta}>{r.anonymized ? 'Dados anonimizados' : `${r.name} · ${[r.email, r.phone].filter(Boolean).join(' · ')}`} · ref. {r.reference} · pedido {formatDateTime(r.createdAt)}</div>
              {r.note ? <p style={{ marginTop: 6 }}>“{r.note}”</p> : null}
              {r.internalNote ? <p className={s.sub}>Nota interna: {r.internalNote}</p> : null}
              {r.contactedAt ? <p className={s.sub}>Contacto registado {formatDateTime(r.contactedAt)}{r.handledBy ? ` por ${r.handledBy}` : ''}</p> : null}
            </div>
            <StatusBadge meta={RESERVATION_STATUS[r.status]} />
          </div>
          {r.status === 'pending' || r.status === 'confirmed' ? (
            open === r.id ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Nota interna (opcional)" aria-label="Nota interna" />
                {r.status === 'pending' ? (
                  <label className={s.switchRow}><input type="checkbox" className={s.check} checked={contact} onChange={(e) => setContact(e.target.checked)} />Confirmo que contactei o cliente e há lugar</label>
                ) : null}
                <div className={s.actions}>
                  {r.status === 'pending' ? <>
                    <Button variant="success" disabled={!contact} loading={pending === `c-${r.id}`} onClick={async () => { const x = await act(`c-${r.id}`, `/reservations/${r.id}/transition`, { target: 'confirmed', version: r.version, contactConfirmed: contact, internalNote: note || undefined }, { ok: 'Reserva confirmada.' }); if (x.ok) setOpen(null); }}>Confirmar</Button>
                    <Button variant="secondary" loading={pending === `d-${r.id}`} onClick={async () => { const x = await act(`d-${r.id}`, `/reservations/${r.id}/transition`, { target: 'declined', version: r.version, internalNote: note || undefined }, { ok: 'Pedido recusado.' }); if (x.ok) setOpen(null); }}>Recusar</Button>
                  </> : <>
                    <Button variant="success" onClick={() => void act(`done-${r.id}`, `/reservations/${r.id}/transition`, { target: 'completed', version: r.version, internalNote: note || undefined }, { ok: 'Marcada como concluída.' })}>Concluída</Button>
                    <Button variant="secondary" onClick={() => void act(`ns-${r.id}`, `/reservations/${r.id}/transition`, { target: 'no_show', version: r.version, internalNote: note || undefined }, { ok: 'Registado: não compareceu.' })}>Não compareceu</Button>
                  </>}
                  <Button variant="ghost" onClick={() => void act(`x-${r.id}`, `/reservations/${r.id}/transition`, { target: 'cancelled', version: r.version, internalNote: note || undefined }, { ok: 'Reserva cancelada.' })}>Cancelar reserva</Button>
                  <Button variant="ghost" onClick={() => setOpen(null)}>Fechar</Button>
                </div>
              </div>
            ) : <div><Button variant="secondary" onClick={() => { setOpen(r.id); setContact(false); setNote(''); }}>Tratar</Button></div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
