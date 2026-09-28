'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { formatTime } from '@/lib/time';
import { Icon } from '@/components/ui/Icon';
import s from '@/components/ui/ui.module.css';

/** One QueryClient per mounted surface (tenant/session scoped by the page); never a source of truth. */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { retry: 1, refetchOnWindowFocus: true, refetchOnReconnect: true, staleTime: 0, gcTime: 60_000 },
      mutations: { retry: 0 },
    },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return online;
}

export function usePageVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const u = () => setVisible(document.visibilityState === 'visible');
    u();
    document.addEventListener('visibilitychange', u);
    return () => document.removeEventListener('visibilitychange', u);
  }, []);
  return visible;
}

/** Ticks every second (UI clock only; never written to the database). */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export type ConnState = 'live' | 'polling' | 'stale' | 'offline';

/**
 * Connection state derived from the snapshot query:
 * offline (navigator/network error) → immediately; no successful read for 10 s → stale.
 * Mutations must be disabled unless state is 'live' or 'polling'.
 */
/** `lastSuccessAt` null = nothing to keep fresh (always considered current). */
export function useConnState(lastSuccessAt: number | null, isError: boolean, realtime: 'connected' | 'degraded' | 'off' = 'off'): ConnState {
  const online = useOnline();
  const now = useNow(1000);
  if (!online) return 'offline';
  if (lastSuccessAt !== null && now - lastSuccessAt > 10_000) return isError ? 'offline' : 'stale';
  return realtime === 'connected' ? 'live' : 'polling';
}

export function ConnectionBanner({ state, lastSuccessAt, onRetry, compact = false }: {
  state: ConnState; lastSuccessAt: number; onRetry?: () => void; compact?: boolean;
}) {
  if (state === 'live' || state === 'polling') {
    if (compact) return null;
    return null;
  }
  const time = lastSuccessAt ? formatTime(new Date(lastSuccessAt)) : '—';
  return (
    <div className={`${s.connBanner} ${state === 'stale' ? s.connBannerWarn : ''}`} role="status" aria-live="polite">
      <Icon name={state === 'offline' ? 'wifiOff' : 'refresh'} size={18} />
      <span style={{ flex: 1 }}>
        {state === 'offline' ? 'Sem ligação.' : 'A ligação está lenta.'} Dados atualizados às {time}. As ações ficam bloqueadas até atualizar.
      </span>
      {onRetry ? <button type="button" onClick={onRetry} style={{ minHeight: 40, padding: '0 12px', border: '1px solid currentColor', background: 'transparent', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Atualizar</button> : null}
    </div>
  );
}

export function ConnectionDot({ state }: { state: ConnState }) {
  const label = { live: 'Em tempo real', polling: 'Atualização automática', stale: 'A atualizar…', offline: 'Sem ligação' }[state];
  const cls = state === 'offline' ? s.connBad : state === 'stale' ? s.connWarn : '';
  return <span className={`${s.conn} ${cls}`}><span className={s.connDot} aria-hidden />{label}</span>;
}
