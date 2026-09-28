'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, ApiClientError } from '@/lib/http/client';
import { usePageVisible, useConnState, type ConnState } from '@/lib/realtime/connection';
import type { CartLine, GuestSnapshot } from '@/modules/tables/types';
import type { MenuItemDTO } from '@/modules/menu/types';

type Mode = 'session' | 'join' | 'public';

type TableCtx = {
  tenantId: string; basePath: string; label: string; restaurantName: string; mode: Mode;
  snapshot: GuestSnapshot | null; conn: ConnState; lastSuccessAt: number; ended: null | 'VISIT_CLOSED' | 'GUEST_SESSION_EXPIRED';
  canMutate: boolean; refresh: () => Promise<void>; url: (p?: string) => string;
  cart: CartLine[]; addToCart: (item: MenuItemDTO, qty: number, note: string) => void;
  setQuantity: (key: string, qty: number) => void; setNote: (key: string, note: string) => void; removeLine: (key: string) => void;
  replaceCart: (lines: CartLine[]) => void; cartKey: string | null;
};

const Ctx = createContext<TableCtx | null>(null);
export function useTable() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTable outside TableProvider');
  return c;
}

function lineKey(itemId: string, note: string) {
  return `${itemId}::${note.trim()}`;
}

export function TableProvider({ children, tenantId, basePath, label, restaurantName, mode, initialSnapshot }: {
  children: ReactNode; tenantId: string; basePath: string; label: string; restaurantName: string; mode: Mode; initialSnapshot: GuestSnapshot | null;
}) {
  const visible = usePageVisible();
  const qc = useQueryClient();
  const [ended, setEnded] = useState<TableCtx['ended']>(null);
  const url = useCallback((p = '') => `${basePath}/mesa/${label.toLowerCase()}${p}`, [basePath, label]);

  const query = useQuery({
    queryKey: ['guest', tenantId, 'snapshot'],
    enabled: mode === 'session' && !ended,
    initialData: initialSnapshot ?? undefined,
    queryFn: async () => {
      try {
        const { data } = await api<GuestSnapshot>(`${basePath}/api/v1/guest/snapshot`, { retries: 0, timeoutMs: 8000 });
        return data;
      } catch (e) {
        if (e instanceof ApiClientError && (e.code === 'VISIT_CLOSED' || e.code === 'GUEST_SESSION_EXPIRED')) setEnded(e.code);
        throw e;
      }
    },
    // Guest context polls every 3 s in the foreground (no anonymous realtime channel).
    refetchInterval: visible ? 3000 : 20_000,
    refetchIntervalInBackground: false,
    retry: 0,
  });

  const snapshot = query.data ?? null;
  const conn = useConnState(mode === 'session' ? query.dataUpdatedAt : null, query.isError);
  const cartKey = snapshot ? `ros:cart:${tenantId}:${snapshot.visit.id}:${snapshot.session.publicId}` : null;

  const [cart, setCart] = useState<CartLine[]>([]);
  const loaded = useRef<string | null>(null);
  useEffect(() => {
    if (!cartKey || loaded.current === cartKey) return;
    loaded.current = cartKey;
    try {
      const raw = sessionStorage.getItem(cartKey);
      // Hydrating from sessionStorage can only happen after mount (not available during SSR).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCart(raw ? (JSON.parse(raw) as CartLine[]) : []);
      // Drop carts of other visits/sessions of this tenant (visit changed or device switched table).
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(`ros:cart:${tenantId}:`) && k !== cartKey) sessionStorage.removeItem(k);
      }
    } catch { setCart([]); }
  }, [cartKey, tenantId]);
  useEffect(() => {
    if (!cartKey || loaded.current !== cartKey) return;
    try { sessionStorage.setItem(cartKey, JSON.stringify(cart)); } catch { /* storage full or disabled */ }
  }, [cart, cartKey]);
  useEffect(() => {
    if (!ended) return;
    if (cartKey) { try { sessionStorage.removeItem(cartKey); } catch { /* */ } }
    // Session ended on the server: the local cart must be discarded (external event → state sync).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCart([]);
  }, [ended, cartKey]);

  const addToCart = useCallback((item: MenuItemDTO, qty: number, note: string) => {
    setCart((prev) => {
      const k = lineKey(item.id, note);
      const existing = prev.find((l) => l.key === k);
      if (existing) {
        return prev.map((l) => (l.key === k ? { ...l, quantity: Math.min(10, l.quantity + qty), expectedPriceCents: item.priceCents, expectedItemVersion: item.version } : l));
      }
      return [...prev, { key: k, itemId: item.id, slug: item.slug, name: item.name, quantity: Math.min(10, qty), note: note.trim(),
        expectedPriceCents: item.priceCents, expectedItemVersion: item.version }];
    });
  }, []);
  const setQuantity = useCallback((key: string, qty: number) =>
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, Math.min(10, qty)) } : l))), []);
  const setNote = useCallback((key: string, note: string) =>
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, note: note.slice(0, 160) } : l))), []);
  const removeLine = useCallback((key: string) => setCart((prev) => prev.filter((l) => l.key !== key)), []);
  const replaceCart = useCallback((lines: CartLine[]) => setCart(lines), []);

  const refresh = useCallback(async () => { await qc.invalidateQueries({ queryKey: ['guest', tenantId, 'snapshot'] }); }, [qc, tenantId]);

  const value = useMemo<TableCtx>(() => ({
    tenantId, basePath, label, restaurantName, mode, snapshot, conn, lastSuccessAt: query.dataUpdatedAt, ended,
    canMutate: mode === 'session' && !ended && (conn === 'live' || conn === 'polling'),
    refresh, url, cart, addToCart, setQuantity, setNote, removeLine, replaceCart, cartKey,
  }), [tenantId, basePath, label, restaurantName, mode, snapshot, conn, query.dataUpdatedAt, ended, refresh, url, cart, addToCart, setQuantity, setNote, removeLine, replaceCart, cartKey]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
