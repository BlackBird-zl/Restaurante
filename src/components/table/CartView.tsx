'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, ApiClientError, errorMessage, newIdempotencyKey } from '@/lib/http/client';
import { formatEUR } from '@/lib/money';
import { padOrderNumber } from '@/modules/orders/status';
import type { CartLine } from '@/modules/tables/types';
import { Button, Notice } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { ALLERGY_NOTICE } from '@/components/public/ItemDetail';
import { Stepper } from './TableViews';
import { useTable } from './TableProvider';
import s from './table.module.css';

type Pending = { key: string; payload: string };
type Changed = { itemId: string; name: string; expectedPriceCents: number; currentPriceCents: number; currentVersion: number };
type Unavailable = { itemId: string; name?: string; reason: string };

function payloadOf(cart: CartLine[]) {
  return JSON.stringify(cart.map((l) => ({
    itemId: l.itemId, quantity: l.quantity, ...(l.note ? { note: l.note } : {}),
    expectedItemVersion: l.expectedItemVersion, expectedPriceCents: l.expectedPriceCents,
  })));
}

/**
 * Sends ONE intention with an Idempotency-Key stored in sessionStorage. A timeout is not a
 * failure: the same key/payload is re-sent to learn the real outcome ("A verificar o envio…").
 * The cart is only cleared after the server confirms the commit.
 */
export function CartView() {
  const t = useTable();
  const [state, setState] = useState<'idle' | 'sending' | 'unknown'>('idle');
  const [result, setResult] = useState<{ number: number; totalCents: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState<Changed[]>([]);
  const [unavailable, setUnavailable] = useState<Unavailable[]>([]);
  const pendingKey = t.cartKey ? t.cartKey.replace('ros:cart:', 'ros:pending-order:') : null;

  const total = t.cart.reduce((a, l) => a + l.quantity * l.expectedPriceCents, 0);
  const units = t.cart.reduce((a, l) => a + l.quantity, 0);

  function readPending(): Pending | null {
    if (!pendingKey) return null;
    try { const r = sessionStorage.getItem(pendingKey); return r ? (JSON.parse(r) as Pending) : null; } catch { return null; }
  }
  function writePending(p: Pending | null) {
    if (!pendingKey) return;
    try { if (p) sessionStorage.setItem(pendingKey, JSON.stringify(p)); else sessionStorage.removeItem(pendingKey); } catch { /* */ }
  }

  async function send() {
    if (state === 'sending' || !t.cart.length) return;
    const payload = payloadOf(t.cart);
    let pending = readPending();
    if (!pending || pending.payload !== payload) {
      pending = { key: newIdempotencyKey(), payload }; // a changed payload gets a new key
      writePending(pending);
    }
    setState('sending');
    setError(null);
    setChanged([]);
    setUnavailable([]);
    try {
      const { data } = await api<{ order: { number: number; totalCents: number } }>(`${t.basePath}/api/v1/guest/orders`, {
        body: { lines: JSON.parse(payload) }, idempotencyKey: pending.key,
      });
      writePending(null);
      t.replaceCart([]); // only the submitted lines (the whole cart payload) are removed
      setResult({ number: data.order.number, totalCents: data.order.totalCents });
      setState('idle');
      void t.refresh();
    } catch (e) {
      if (e instanceof ApiClientError && e.outcomeUnknown) {
        setState('unknown'); // keep key + cart; re-check with the same key
        return;
      }
      setState('idle');
      writePending(null);
      if (e instanceof ApiClientError && e.code === 'PRICE_CHANGED') {
        setChanged(((e.details as { lines?: Changed[] })?.lines) ?? []);
      } else if (e instanceof ApiClientError && e.code === 'ITEM_UNAVAILABLE') {
        setUnavailable(((e.details as { lines?: Unavailable[] })?.lines) ?? []);
        setChanged(((e.details as { changed?: Changed[] })?.changed) ?? []);
      } else if (e instanceof ApiClientError && e.code === 'RATE_LIMITED') {
        setError(`Muitos envios seguidos. Aguarde ${e.retryAfterSeconds ?? 20} s e envie de novo.`);
      } else setError(errorMessage(e));
    }
  }

  // When the connection comes back after an unknown outcome, verify automatically (same key).
  useEffect(() => {
    if (state === 'unknown' && t.canMutate) {
      const id = setTimeout(() => void send(), 1500);
      return () => clearTimeout(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, t.canMutate]);

  function acceptNewPrices() {
    t.replaceCart(t.cart.map((l) => {
      const c = changed.find((x) => x.itemId === l.itemId);
      return c ? { ...l, expectedPriceCents: c.currentPriceCents, expectedItemVersion: c.currentVersion } : l;
    }));
    setChanged([]);
  }
  function removeUnavailable() {
    t.replaceCart(t.cart.filter((l) => !unavailable.some((u) => u.itemId === l.itemId)));
    setUnavailable([]);
  }

  const snap = t.snapshot;
  if (result && !t.cart.length) {
    return (
      <div className={s.hello} role="status" aria-live="polite">
        <Notice tone="ok">Pedido recebido.</Notice>
        <h1 className={s.helloTitle}>Pedido {padOrderNumber(result.number)}</h1>
        <p>{formatEUR(result.totalCents)} adicionados à conta da Mesa {t.label}. A cozinha e o bar já receberam o que lhes cabe.</p>
        <Link className={s.actionBtn} href={t.url('/pedidos')}><Icon name="clock" />Acompanhar pedidos<span /></Link>
        <Link className={s.actionBtn} href={t.url('/carta')}><Icon name="list" />Pedir mais<span /></Link>
      </div>
    );
  }
  if (!t.cart.length) {
    return (
      <div className={s.hello}>
        <h1 className={s.helloTitle}>O seu pedido</h1>
        <p className={s.muted}>Ainda não escolheu nada.</p>
        <Link className={s.actionBtn} href={t.url('/carta')}><Icon name="list" />Ver a carta<span /></Link>
      </div>
    );
  }
  const blocked = snap?.visit.status !== 'open' ? 'A mesa está a fechar a conta. Já não é possível adicionar pedidos.'
    : snap?.orderingMode !== 'open' ? 'Os pedidos pela mesa estão pausados neste momento. Chame a equipa.' : null;

  return (
    <div>
      <h1 className={s.helloTitle} style={{ margin: '8px 0 4px' }}>O seu pedido</h1>
      <p className={s.muted}>Só este telemóvel vê este carrinho até o enviar.</p>
      <div className={s.card} style={{ marginTop: 14 }}>
        {t.cart.map((l) => {
          const c = changed.find((x) => x.itemId === l.itemId);
          const u = unavailable.find((x) => x.itemId === l.itemId);
          return (
            <div key={l.key} className={s.row} style={{ flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                <Link href={t.url(`/carta/${l.slug}`)} style={{ fontWeight: 600 }}>{l.name}</Link>
                <p className={s.muted}>{formatEUR(l.expectedPriceCents)} cada</p>
                {c ? <p className={s.changed}>Preço atual: {formatEUR(c.currentPriceCents)}</p> : null}
                {u ? <p className={s.changed}>Indisponível neste momento</p> : null}
                <label className={s.muted} style={{ display: 'block', marginTop: 6 }}>
                  <span className="sr-only">Observação para {l.name}</span>
                  <input className="" value={l.note} maxLength={160} placeholder="Observação (opcional)"
                    onChange={(e) => t.setNote(l.key, e.target.value)}
                    style={{ width: '100%', minHeight: 40, border: '1px solid var(--c-border)', borderRadius: 8, padding: '0 10px', background: '#fff' }} />
                </label>
              </div>
              <div style={{ display: 'grid', justifyItems: 'end', gap: 8 }}>
                <Stepper value={l.quantity} onChange={(n) => t.setQuantity(l.key, n)} label={l.name} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={s.price}>{formatEUR(l.quantity * l.expectedPriceCents)}</span>
                  <button type="button" onClick={() => t.removeLine(l.key)} aria-label={`Remover ${l.name}`}
                    style={{ minWidth: 44, minHeight: 44, border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--c-muted)' }}><Icon name="x" /></button>
                </div>
              </div>
            </div>
          );
        })}
        <div className={s.total}><span>{units} {units === 1 ? 'item' : 'itens'} · total estimado</span><span className="tabular">{formatEUR(total)}</span></div>
      </div>
      <p className={s.muted} style={{ margin: '12px 0' }}>{ALLERGY_NOTICE}</p>

      {changed.length ? (
        <Notice tone="warn">
          O preço de {changed.map((c) => c.name).join(', ')} mudou. O pedido não foi enviado.{' '}
          <button type="button" onClick={acceptNewPrices} style={{ fontWeight: 700, textDecoration: 'underline', background: 'none', border: 0, cursor: 'pointer', minHeight: 44 }}>Aceitar os novos preços e rever</button>
        </Notice>
      ) : null}
      {unavailable.length ? (
        <Notice tone="warn">
          Um ou mais produtos deixaram de estar disponíveis. O pedido não foi enviado.{' '}
          <button type="button" onClick={removeUnavailable} style={{ fontWeight: 700, textDecoration: 'underline', background: 'none', border: 0, cursor: 'pointer', minHeight: 44 }}>Remover indisponíveis</button>
        </Notice>
      ) : null}
      {state === 'unknown' ? <Notice tone="warn">Não conseguimos confirmar. A verificar o envio… (o carrinho mantém-se; não será cobrado duas vezes)</Notice> : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {blocked ? <Notice tone="warn">{blocked}</Notice> : null}

      <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
        <Button variant="primary" size="xl" block loading={state === 'sending'}
          disabled={!t.canMutate || Boolean(blocked) || changed.length > 0 || unavailable.length > 0}
          onClick={() => void send()}>
          {state === 'unknown' ? 'Verificar envio' : `Adicionar à conta da Mesa ${t.label}`}
        </Button>
        <p className={s.muted} style={{ textAlign: 'center' }}>Os itens entram na conta partilhada da mesa. Depois de enviado, o pedido só pode ser corrigido pela equipa.</p>
      </div>
    </div>
  );
}
