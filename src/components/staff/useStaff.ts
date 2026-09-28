'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiClientError, errorMessage, newIdempotencyKey } from '@/lib/http/client';
import { usePageVisible, useConnState } from '@/lib/realtime/connection';
import { useStaffRT } from './StaffRealtime';

/** Staff snapshot query: realtime invalidation + 4 s reconciliation polling (with jitter). */
export function useStaffSnapshot<T>(key: string[], path: string, opts: { enabled?: boolean; interval?: number } = {}) {
  const rt = useStaffRT();
  const visible = usePageVisible();
  const [serverOffset, setServerOffset] = useState(0);
  const [jitter] = useState(() => Math.floor(Math.random() * 500));
  const q = useQuery({
    queryKey: ['staff', rt.restaurantId, ...key],
    enabled: opts.enabled ?? true,
    queryFn: async () => {
      const { data, serverTime } = await api<T>(`/api/v1/staff/r/${rt.slug}${path}`, { retries: 0, timeoutMs: 8000 });
      setServerOffset(new Date(serverTime).getTime() - Date.now());
      return data;
    },
    refetchInterval: visible ? (opts.interval ?? 4000) + jitter : 30_000,
    refetchIntervalInBackground: false,
    retry: 0,
  });
  const conn = useConnState(q.dataUpdatedAt, q.isError, rt.status === 'connected' ? 'connected' : 'degraded');
  return { ...q, conn, lastSuccessAt: q.dataUpdatedAt, serverOffset, canMutate: conn === 'live' || conn === 'polling' };
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ApiClientError | Error; message: string };

/**
 * Runs one staff mutation with a fresh Idempotency-Key per user intention.
 * Conflicts (409) trigger an immediate refetch so the UI shows the real state; nothing is
 * shown as done unless the server confirmed it.
 */
export function useStaffAction() {
  const rt = useStaffRT();
  const qc = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);
  const run = useCallback(async <T,>(id: string, path: string, body: unknown, method: 'POST' | 'PATCH' | 'DELETE' = 'POST'): Promise<ActionResult<T>> => {
    setPending(id);
    try {
      const { data } = await api<T>(`/api/v1/staff/r/${rt.slug}${path}`, { method, body, idempotencyKey: newIdempotencyKey() });
      await qc.invalidateQueries({ queryKey: ['staff', rt.restaurantId] });
      return { ok: true, data };
    } catch (e) {
      if (e instanceof ApiClientError && (e.status === 409 || e.status === 404 || e.status === 410)) {
        void qc.invalidateQueries({ queryKey: ['staff', rt.restaurantId] });
      }
      return { ok: false, error: e as Error, message: errorMessage(e) };
    } finally {
      setPending(null);
    }
  }, [qc, rt.restaurantId, rt.slug]);
  return { run, pending };
}

/** Plays a short tone once per new id (explicit opt-in; never the only signal). */
export function useNewItemSound(ids: string[], enabled: boolean) {
  const seen = useRef<Set<string> | null>(null);
  const key = ids.join(',');
  useEffect(() => {
    const list = key ? key.split(',') : [];
    if (seen.current === null) { seen.current = new Set(list); return; }
    const fresh = list.filter((i) => !seen.current!.has(i));
    fresh.forEach((i) => seen.current!.add(i));
    if (!fresh.length || !enabled) return;
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.4);
    } catch { /* audio blocked */ }
  }, [key, enabled]);
}
