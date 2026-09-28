import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { PublicTenantContext } from '@/modules/tenancy/context.server';
import { getPublicTable } from '@/modules/site/queries.server';
import type { GuestSnapshot } from './types';

export type TableState =
  | { mode: 'session'; label: string; snapshot: GuestSnapshot }
  | { mode: 'join'; label: string; visitState: 'none' | 'open' | 'billing'; otherTable?: string }
  | { mode: 'public'; label: string; notice?: 'ended' | 'expired'; otherTable?: string };

/**
 * Template mode intentionally exposes the table context as a read-only showcase.
 * Real QR authorization/persistence can be re-enabled later with a backend provider.
 */
export const getTableState = cache(async (ctx: PublicTenantContext, labelParam: string): Promise<TableState> => {
  const table = await getPublicTable(ctx.restaurantId, labelParam.toLowerCase());
  if (!table) notFound();
  return { mode: 'public', label: table.label };
});
