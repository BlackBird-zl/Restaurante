'use client';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { browserClient } from '@/lib/supabase/browser';

type RT = { status: 'connecting' | 'connected' | 'degraded'; restaurantId: string; memberId: string; slug: string };
const Ctx = createContext<RT | null>(null);
export function useStaffRT() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useStaffRT outside StaffRealtime');
  return c;
}

/**
 * Subscribes ONLY to INSERTs on public.staff_invalidations for this member (RLS decides what
 * arrives; the filter is not authorization). Each event invalidates staff queries → refetch
 * through the BFF. Polling (4 s + jitter) keeps converging when the socket is down.
 */
export function StaffRealtime({ restaurantId, memberId, slug, children }: { restaurantId: string; memberId: string; slug: string; children: ReactNode }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<RT['status']>('connecting');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const sb = browserClient();
    const flush = () => {
      if (timer.current) return;
      timer.current = setTimeout(() => {
        timer.current = null;
        void qc.invalidateQueries({ queryKey: ['staff', restaurantId] });
      }, 250);
    };
    const channel = sb
      .channel(`staff-inv-${memberId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'staff_invalidations', filter: `recipient_member_id=eq.${memberId}` }, flush)
      .subscribe((st) => {
        if (st === 'SUBSCRIBED') {
          setStatus('connected');
          flush(); // snapshot after SUBSCRIBED closes the window of changes during connection
        } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' || st === 'CLOSED') {
          setStatus('degraded');
        }
      });
    return () => {
      if (timer.current) clearTimeout(timer.current);
      void sb.removeChannel(channel);
    };
  }, [memberId, restaurantId, qc]);

  return <Ctx.Provider value={{ status, restaurantId, memberId, slug }}>{children}</Ctx.Provider>;
}
