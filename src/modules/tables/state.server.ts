import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { PublicTenantContext } from '@/modules/tenancy/context.server';
import { getPublicTable } from '@/modules/site/queries.server';
import { loadGuestSnapshot, loadQrTable, qrContext } from './guest.server';
import type { GuestSnapshot } from './types';

export type TableState =
  | { mode: 'session'; label: string; snapshot: GuestSnapshot }
  | { mode: 'join'; label: string; visitState: 'none' | 'open' | 'billing'; otherTable?: string }
  | { mode: 'public'; label: string; notice?: 'ended' | 'expired'; otherTable?: string };

/**
 * Decides what this device may do at /mesa/{label}:
 * session (valid cookie for this table) → join (fresh QR context for this table) → public (menu only).
 * The QR alone never grants ordering; a label alone never reveals occupancy.
 */
export const getTableState = cache(async (ctx: PublicTenantContext, labelParam: string): Promise<TableState> => {
  const label = labelParam.toLowerCase();
  const table = await getPublicTable(ctx.restaurantId, label);
  if (!table) notFound();
  const snap = await loadGuestSnapshot(ctx.restaurantId);
  let otherTable: string | undefined;
  let notice: 'ended' | 'expired' | undefined;
  if (snap?.ok) {
    if (snap.data.table.label.toLowerCase() === label) return { mode: 'session', label: table.label, snapshot: snap.data };
    otherTable = snap.data.table.label;
  } else if (snap && !snap.ok) {
    notice = snap.error === 'VISIT_CLOSED' ? 'ended' : snap.error === 'GUEST_SESSION_EXPIRED' ? 'expired' : undefined;
  }
  const qr = await qrContext(ctx.restaurantId);
  if (qr) {
    const q = await loadQrTable(ctx.restaurantId, qr.q);
    if (q?.qrActive && q.tablePublicSlug === label) return { mode: 'join', label: table.label, visitState: q.visitState, otherTable };
  }
  return { mode: 'public', label: table.label, notice, otherTable };
});
