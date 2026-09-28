'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api, ApiClientError, errorMessage, newIdempotencyKey } from '@/lib/http/client';
import { CALL_STATUS, CALL_TYPE, type CallType } from '@/modules/orders/status';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Notice, Sheet } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { useTable } from './TableProvider';
import s from './table.module.css';

const TYPES: Exclude<CallType, 'bill'>[] = ['cutlery', 'help', 'service'];

/** Finite reasons, no free text. Same active reason from another device returns the same call. */
export function ServiceCallSheet({ open, onOpenChange, drinksHref }: { open: boolean; onOpenChange: (o: boolean) => void; drinksHref: string | null }) {
  const t = useTable();
  const [pending, setPending] = useState<CallType | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'danger' | 'warn'; text: string } | null>(null);
  const active = t.snapshot?.calls.filter((c) => c.status === 'new' || c.status === 'claimed') ?? [];
  const recent = t.snapshot?.calls.filter((c) => c.status === 'completed') ?? [];

  async function call(type: CallType) {
    if (pending) return;
    setPending(type);
    setMsg(null);
    try {
      const { data } = await api<{ existing: boolean }>(`${t.basePath}/api/v1/guest/calls`, { body: { type }, idempotencyKey: newIdempotencyKey() });
      setMsg({ tone: 'ok', text: data.existing ? 'Este pedido já tinha sido feito à equipa. Aguarde, por favor.' : 'Chamado enviado.' });
      await t.refresh();
    } catch (e) {
      if (e instanceof ApiClientError && e.code === 'RATE_LIMITED') {
        setMsg({ tone: 'warn', text: `Acabou de chamar a equipa. Pode voltar a chamar dentro de ${e.retryAfterSeconds ?? 20} s.` });
      } else setMsg({ tone: 'danger', text: errorMessage(e) });
    } finally {
      setPending(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Chamar a equipa" description={`Mesa ${t.label}`}>
      {active.length ? (
        <div className={s.card} style={{ marginBottom: 14 }} aria-live="polite">
          {active.map((c) => (
            <div key={c.id} className={s.row}>
              <span>{CALL_TYPE[c.type].guestLabel}</span>
              <StatusBadge meta={CALL_STATUS[c.status]} guest />
            </div>
          ))}
        </div>
      ) : null}
      <div className={s.callGrid}>
        {TYPES.map((type) => {
          const isActive = active.some((c) => c.type === type);
          return (
            <button key={type} type="button" className={s.actionBtn} disabled={!t.canMutate || pending !== null}
              onClick={() => void call(type)} aria-busy={pending === type}>
              <Icon name={CALL_TYPE[type].icon} />{CALL_TYPE[type].guestLabel}
              <span>{pending === type ? 'A enviar…' : isActive ? 'Pedido ativo' : ''}</span>
            </button>
          );
        })}
        {drinksHref ? (
          <Link href={drinksHref} className={s.actionBtn} onClick={() => onOpenChange(false)}>
            <Icon name="glass" />Pedir bebida<span>Abre a carta</span>
          </Link>
        ) : null}
        <Link href={t.url('/conta')} className={s.actionBtn} onClick={() => onOpenChange(false)}>
          <Icon name="receipt" />Pedir a conta<span>Ver consumo</span>
        </Link>
      </div>
      {msg ? <div style={{ marginTop: 14 }}><Notice tone={msg.tone}>{msg.text}</Notice></div> : null}
      {!t.canMutate && t.mode === 'session' ? <p className={s.muted} style={{ marginTop: 12 }}>Sem ligação atualizada: aguarde antes de chamar.</p> : null}
      {recent.length ? <p className={s.muted} style={{ marginTop: 12 }}>Atendido recentemente: {recent.map((c) => CALL_TYPE[c.type].guestLabel).join(', ')}.</p> : null}
    </Sheet>
  );
}
