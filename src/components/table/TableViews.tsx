'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { api, ApiClientError, errorMessage } from '@/lib/http/client';
import { formatEUR } from '@/lib/money';
import { formatTime } from '@/lib/time';
import { LINE_STATUS, ORDER_STATUS, BILL_STATUS, padOrderNumber } from '@/modules/orders/status';
import type { MenuItemDTO } from '@/modules/menu/types';
import { Button, Field, Notice, btnClass } from '@/components/ui/primitives';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Icon } from '@/components/ui/Icon';
import { ALLERGY_NOTICE } from '@/components/public/ItemDetail';
import { useTable } from './TableProvider';
import s from './table.module.css';

/* ---------------------------------- Entry (session) ---------------------------------- */
export function TableHome() {
  const t = useTable();
  const snap = t.snapshot;
  if (!snap) return null;
  const pendingLines = snap.orders.flatMap((o) => o.lines).filter((l) => l.status !== 'delivered' && l.status !== 'cancelled').length;
  return (
    <div className={s.hello}>
      <p className={s.muted}>{t.restaurantName}</p>
      <h1 className={s.helloTitle}>Está na Mesa {t.label}</h1>
      <p>Os pedidos são adicionados à conta desta mesa.</p>
      {snap.visit.status === 'billing' ? <Notice tone="warn">A mesa está a fechar a conta. Pode acompanhar o consumo e chamar a equipa.</Notice> : null}
      {snap.orderingMode !== 'open' && snap.visit.status === 'open' ? (
        <Notice tone="warn">Os pedidos pela mesa estão {snap.orderingMode === 'paused' ? 'pausados' : 'fechados'} neste momento. Chame a equipa.</Notice>
      ) : null}
      <div className={s.actions} style={{ marginTop: 10 }}>
        <Link className={s.actionBtn} href={t.url('/carta')}><Icon name="list" />Ver a carta<span /></Link>
        <Link className={s.actionBtn} href={t.url('/pedidos')}><Icon name="clock" />Os pedidos da mesa<span>{pendingLines ? `${pendingLines} em curso` : `${snap.orders.length} envio(s)`}</span></Link>
        <Link className={s.actionBtn} href={t.url('/conta')}><Icon name="receipt" />Pedir a conta<span className="tabular">{formatEUR(snap.bill.totalCents)}</span></Link>
      </div>
      <p className={s.muted} style={{ marginTop: 8 }}>Para chamar a equipa, use “Ajuda” na barra inferior.</p>
    </div>
  );
}

/* ---------------------------------- Join with code ---------------------------------- */
export function JoinForm({ visitState }: { visitState: 'none' | 'open' | 'billing' }) {
  const t = useTable();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy.current) return; // one join at a time (no double tap)
    if (!/^\d{6}$/.test(code)) { setError('O código tem seis algarismos.'); return; }
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      await api(`${t.basePath}/api/v1/guest/join`, { body: { code }, retries: 0 });
      router.replace(t.url('/carta'));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'INVALID_CODE') {
        const left = (err.details as { attemptsLeft?: number } | undefined)?.attemptsLeft;
        setError(`Código incorreto.${typeof left === 'number' ? ` Restam ${left} tentativa(s) antes de uma pausa.` : ''} Confirme com a equipa.`);
      } else if (err instanceof ApiClientError && err.code === 'QR_INVALID') {
        setError('Leia de novo o código QR da mesa e tente outra vez.');
      } else setError(errorMessage(err));
      busy.current = false;
      setPending(false);
    }
  }

  if (visitState === 'none') {
    return (
      <div className={s.hello}>
        <h1 className={s.helloTitle}>Mesa {t.label}</h1>
        <p>A equipa irá abrir o atendimento desta mesa. Enquanto isso, pode ver a carta.</p>
        <Link className={s.actionBtn} href={t.url('/carta')}><Icon name="list" />Ver a carta<span /></Link>
        <Button variant="secondary" size="lg" onClick={() => router.refresh()} icon="refresh">Já abriram o atendimento</Button>
      </div>
    );
  }
  if (visitState === 'billing') {
    return (
      <div className={s.hello}>
        <h1 className={s.helloTitle}>Mesa {t.label}</h1>
        <Notice tone="warn">Esta mesa está a fechar a conta. Não é possível entrar com um novo dispositivo; fale com a equipa.</Notice>
        <Link className={s.actionBtn} href={t.url('/carta')}><Icon name="list" />Ver a carta<span /></Link>
      </div>
    );
  }
  return (
    <form className={s.hello} onSubmit={submit} noValidate>
      <h1 className={s.helloTitle}>Mesa {t.label}</h1>
      <p>Para pedir, introduza o código de atendimento que a equipa lhe deu.</p>
      <Field label="Código de atendimento" error={error} hint="Seis algarismos. Não precisa de conta, email ou telefone.">
        {(p) => (
          <input {...p} className={`${p.className} ${s.codeInput}`} inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}"
            maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus />
        )}
      </Field>
      <Button type="submit" variant="primary" size="lg" block loading={pending}>Entrar na mesa</Button>
      <Link className={btnClass('ghost', 'lg', true)} href={t.url('/carta')}>Só ver a carta</Link>
    </form>
  );
}

/* ------------------------------- Add to cart (row + sheet) ------------------------------- */
export function QuickAdd({ item }: { item: MenuItemDTO }) {
  const t = useTable();
  const [flash, setFlash] = useState(false);
  if (t.mode !== 'session' || t.snapshot?.visit.status !== 'open') return null;
  return (
    <button type="button" className={s.quickAdd} disabled={!item.isAvailable}
      aria-label={item.isAvailable ? `Adicionar ${item.name}` : `${item.name} esgotado`}
      onClick={() => { t.addToCart(item, 1, ''); setFlash(true); setTimeout(() => setFlash(false), 900); }}>
      <Icon name={flash ? 'check' : 'plus'} size={22} />
      <span className="sr-only" aria-live="polite">{flash ? `${item.name} adicionado` : ''}</span>
    </button>
  );
}

export function AddToCart({ item }: { item: MenuItemDTO }) {
  const t = useTable();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  if (t.mode !== 'session') {
    return <Notice tone="info">Leia o QR da mesa e introduza o código de atendimento para pedir.</Notice>;
  }
  if (t.snapshot?.visit.status !== 'open') return <Notice tone="warn">A mesa está a fechar a conta. Não é possível adicionar pedidos.</Notice>;
  if (!item.isAvailable) return <Notice tone="warn">Este produto está esgotado de momento.</Notice>;
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontWeight: 600 }}>Quantidade</span>
        <Stepper value={qty} onChange={setQty} label={item.name} />
      </div>
      <Field label="Observação (opcional)" hint={`${ALLERGY_NOTICE} Até 160 caracteres.`}>
        {(p) => <textarea {...p} maxLength={160} value={note} onChange={(e) => setNote(e.target.value)} rows={2} />}
      </Field>
      <Button variant="primary" size="lg" block icon="plus" onClick={() => { t.addToCart(item, qty, note); router.push(t.url('/carta')); }}>
        Adicionar · {formatEUR(item.priceCents * qty)}
      </Button>
    </div>
  );
}

export function Stepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className={s.stepper} role="group" aria-label={`Quantidade de ${label}`}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Menos um"><Icon name="minus" /></button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= 10} aria-label="Mais um"><Icon name="plus" /></button>
    </div>
  );
}

/* ---------------------------------- Orders (shared view) ---------------------------------- */
export function OrdersView() {
  const t = useTable();
  const snap = t.snapshot;
  if (!snap) return null;
  if (!snap.orders.length) {
    return (
      <div className={s.hello}>
        <h1 className={s.helloTitle}>Pedidos</h1>
        <p className={s.muted}>Ainda não há pedidos nesta mesa.</p>
        <Link className={s.actionBtn} href={t.url('/carta')}><Icon name="list" />Ver a carta<span /></Link>
      </div>
    );
  }
  return (
    <div>
      <h1 className={s.helloTitle} style={{ margin: '8px 0 4px' }}>Pedidos da mesa</h1>
      <p className={s.muted}>Cada linha avança sozinha: as bebidas podem chegar antes da comida.</p>
      {[...snap.orders].reverse().map((o) => (
        <section key={o.id} className={s.card} style={{ marginTop: 14 }} aria-label={`Pedido ${padOrderNumber(o.number)}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <strong>Pedido {padOrderNumber(o.number)} {o.mine ? <span className={s.muted}>· deste telemóvel</span> : null}</strong>
            <StatusBadge meta={ORDER_STATUS[o.status]} />
          </div>
          <p className={s.muted}>Enviado às {formatTime(o.submittedAt)}</p>
          <div>
            {o.lines.map((l) => (
              <div key={l.id} className={s.row}>
                <div>
                  <span className={s.qty}>{l.quantity}×</span> {l.name}
                  {l.note ? <p className={s.muted}>Nota: {l.note}</p> : null}
                  <div className={s.lineStatus}><StatusBadge meta={LINE_STATUS[l.status]} guest /></div>
                </div>
                <span className={s.price} style={l.status === 'cancelled' ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}>
                  {formatEUR(l.quantity * l.unitPriceCents)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ---------------------------------- Bill ---------------------------------- */
export function BillView() {
  const t = useTable();
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const keyRef = useRef<string | null>(null);
  const snap = t.snapshot;
  if (!snap) return null;
  const lines = snap.orders.flatMap((o) => o.lines);
  const agg = new Map<string, { name: string; qty: number; unit: number }>();
  for (const l of lines.filter((x) => x.status !== 'cancelled')) {
    const k = `${l.name}|${l.unitPriceCents}`;
    const e = agg.get(k) ?? { name: l.name, qty: 0, unit: l.unitPriceCents };
    e.qty += l.quantity;
    agg.set(k, e);
  }
  const pendingLines = lines.filter((l) => l.status !== 'delivered' && l.status !== 'cancelled').length;
  const requested = snap.bill.status === 'requested';

  async function request() {
    setPending(true);
    setErr(null);
    keyRef.current ??= crypto.randomUUID();
    try {
      await api(`${t.basePath}/api/v1/guest/bill-request`, { body: { expectedVisitRevision: snap!.visit.revision }, idempotencyKey: keyRef.current });
      keyRef.current = null;
      setConfirm(false);
      await t.refresh();
    } catch (e) {
      if (!(e instanceof ApiClientError && e.outcomeUnknown)) keyRef.current = null;
      setErr(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <h1 className={s.helloTitle} style={{ margin: '8px 0 4px' }}>Conta da mesa</h1>
      <p className={s.muted}>Consumo partilhado de todos os dispositivos desta mesa.</p>
      <div className={s.card} style={{ marginTop: 14 }}>
        {agg.size === 0 ? <p className={s.muted}>Ainda sem consumo.</p> : [...agg.values()].map((a) => (
          <div key={`${a.name}${a.unit}`} className={s.row}>
            <span><span className={s.qty}>{a.qty}×</span> {a.name} <span className={s.muted}>({formatEUR(a.unit)})</span></span>
            <span className={s.price}>{formatEUR(a.qty * a.unit)}</span>
          </div>
        ))}
        <div className={s.total}><span>Total atual</span><span className="tabular">{formatEUR(snap.bill.totalCents)}</span></div>
        {pendingLines ? <p className={s.muted}>{pendingLines} item(ns) ainda em preparação ou a caminho.</p> : null}
      </div>
      <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        {requested ? (
          <Notice tone="ok" icon="receipt">
            <strong>{BILL_STATUS.requested.label}.</strong> A equipa vem ter consigo. O pagamento é feito com a equipa (numerário ou terminal).
            Já não é possível adicionar pedidos.
          </Notice>
        ) : confirm ? (
          <div className={s.card} role="group" aria-label="Confirmar pedido de conta">
            <p style={{ fontWeight: 600 }}>Pedir a conta de {formatEUR(snap.bill.totalCents)}?</p>
            <p className={s.muted} style={{ margin: '6px 0 12px' }}>Depois de pedir a conta, a mesa deixa de poder fazer novos pedidos. Pedir a conta não é um pagamento.</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Button variant="primary" size="lg" loading={pending} disabled={!t.canMutate} onClick={() => void request()}>Pedir a conta</Button>
              <Button variant="secondary" size="lg" onClick={() => setConfirm(false)} disabled={pending}>Voltar</Button>
            </div>
          </div>
        ) : (
          <Button variant="primary" size="lg" block icon="receipt" disabled={!t.canMutate || lines.length === 0} onClick={() => setConfirm(true)}>Pedir a conta</Button>
        )}
        {err ? <Notice tone="danger">{err}</Notice> : null}
      </div>
    </div>
  );
}
