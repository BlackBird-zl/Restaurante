'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/http/client';
import { Button, Notice } from '@/components/ui/primitives';
import s from './table.module.css';

/** Device already joined another table: confirm the switch and clear the cart (never merge carts). */
export function SwitchTable({ basePath, from, to }: { basePath: string; from: string; to: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function confirm() {
    setPending(true);
    try {
      await api(`${basePath}/api/v1/guest/leave`, { body: {}, retries: 0 });
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k?.startsWith('ros:')) sessionStorage.removeItem(k);
      }
      router.refresh();
    } catch (e) {
      setErr(errorMessage(e));
      setPending(false);
    }
  }
  return (
    <div className={s.hello}>
      <h1 className={s.helloTitle}>Mudar para a Mesa {to}?</h1>
      <p>Este telemóvel está ligado à Mesa {from}. Ao mudar, o carrinho por enviar é apagado. Os pedidos já enviados continuam na conta da Mesa {from}.</p>
      {err ? <Notice tone="danger">{err}</Notice> : null}
      <Button variant="primary" size="lg" block loading={pending} onClick={() => void confirm()}>Mudar para a Mesa {to}</Button>
      <Button variant="secondary" size="lg" block onClick={() => router.push(`${basePath}/mesa/${from.toLowerCase()}`)}>Continuar na Mesa {from}</Button>
    </div>
  );
}
