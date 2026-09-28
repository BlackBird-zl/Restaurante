'use client';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { api, ApiClientError, errorMessage, newIdempotencyKey } from '@/lib/http/client';
import { formatEUR } from '@/lib/money';
import type { MenuDTO } from '@/modules/menu/types';
import { Button, Notice, inputClass } from '@/components/ui/primitives';
import { useStaffRT } from './StaffRealtime';
import s from './staff.module.css';

/** Assisted order for a guest without phone: same engine and validation as the guest order. */
export function AssistedOrder({ visitId, tableLabel, onDone, onCancel }: { visitId: string; tableLabel: string; onDone: (orderNumber: number) => void; onCancel: () => void }) {
  const rt = useStaffRT();
  const menu = useQuery({ queryKey: ['staff', rt.restaurantId, 'menu'], queryFn: async () => (await api<MenuDTO>(`/api/v1/staff/r/${rt.slug}/menu`)).data });
  const [qty, setQty] = useState<Record<string, number>>({});
  const [q, setQ] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const key = useRef<{ key: string; payload: string } | null>(null);
  const items = menu.data?.items ?? [];
  const chosen = items.filter((i) => (qty[i.id] ?? 0) > 0);
  const total = chosen.reduce((a, i) => a + i.priceCents * (qty[i.id] ?? 0), 0);

  async function send() {
    const lines = chosen.map((i) => ({ itemId: i.id, quantity: qty[i.id]!, expectedItemVersion: i.version, expectedPriceCents: i.priceCents }));
    const payload = JSON.stringify(lines);
    if (!key.current || key.current.payload !== payload) key.current = { key: newIdempotencyKey(), payload };
    setSending(true);
    setErr(null);
    try {
      const { data } = await api<{ order: { number: number } }>(`/api/v1/staff/r/${rt.slug}/visits/${visitId}/orders`, {
        body: { lines, reason: 'Pedido registado pela equipa' }, idempotencyKey: key.current.key,
      });
      key.current = null;
      onDone(data.order.number);
    } catch (e) {
      if (e instanceof ApiClientError && (e.code === 'PRICE_CHANGED' || e.code === 'ITEM_UNAVAILABLE')) void menu.refetch();
      if (!(e instanceof ApiClientError && e.outcomeUnknown)) key.current = null;
      setErr(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  const filtered = q ? items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase())) : items;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <p className={s.sub}>Pedido assistido para a Mesa {tableLabel}. Entra na mesma conta e nas mesmas estações.</p>
      <input className={inputClass} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Procurar produto" aria-label="Procurar produto" />
      <div style={{ maxHeight: '42dvh', overflow: 'auto', border: '1px solid var(--n-200)', borderRadius: 10, padding: '0 10px' }}>
        {menu.isPending ? <p className={s.muted}>A carregar a carta…</p> : filtered.map((i) => (
          <div key={i.id} className={s.row}>
            <span style={{ opacity: i.isAvailable ? 1 : 0.5 }}>{i.name} <span className={s.sub}>{formatEUR(i.priceCents)}{i.isAvailable ? '' : ' · esgotado'}</span></span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Button size="md" variant="secondary" aria-label={`Menos ${i.name}`} disabled={!qty[i.id]} onClick={() => setQty((p) => ({ ...p, [i.id]: Math.max(0, (p[i.id] ?? 0) - 1) }))}>−</Button>
              <span className="tabular" style={{ minWidth: 20, textAlign: 'center', fontWeight: 700 }}>{qty[i.id] ?? 0}</span>
              <Button size="md" variant="secondary" aria-label={`Mais ${i.name}`} disabled={!i.isAvailable || (qty[i.id] ?? 0) >= 10} onClick={() => setQty((p) => ({ ...p, [i.id]: (p[i.id] ?? 0) + 1 }))}>+</Button>
            </span>
          </div>
        ))}
      </div>
      <div className={s.row}><strong>Total estimado</strong><strong className={s.money}>{formatEUR(total)}</strong></div>
      {err ? <Notice tone="danger">{err}</Notice> : null}
      <div className={s.actions}>
        <Button variant="primary" size="lg" disabled={!chosen.length} loading={sending} onClick={() => void send()}>Registar pedido</Button>
        <Button variant="secondary" size="lg" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}
