import type { NextRequest } from 'next/server';
import { handleError, ok } from '@/lib/http/server';
import { readTenantHeaders } from '@/modules/tenancy/context.server';
import { guestSessionHash, loadGuestSnapshot } from '@/modules/tables/guest.server';

/** Private hint for public pages: "Continuar na Mesa X". Returns null without a valid session. */
export async function GET(req: NextRequest) {
  try {
    const ctx = await readTenantHeaders(req);
    if (!ctx || !(await guestSessionHash(ctx.restaurantId))) return ok(null);
    const r = await loadGuestSnapshot(ctx.restaurantId);
    return ok(r && r.ok ? { tableLabel: r.data.table.label } : null);
  } catch (e) {
    return handleError(e);
  }
}
