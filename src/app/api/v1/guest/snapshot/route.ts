import type { NextRequest } from 'next/server';
import { ApiError, handleError, ok } from '@/lib/http/server';
import { readTenantHeaders } from '@/modules/tenancy/context.server';
import { loadGuestSnapshot } from '@/modules/tables/guest.server';

/** Polled every 3 s by the table UI (40/min per session enforced in the RPC). */
export async function GET(req: NextRequest) {
  try {
    const ctx = await readTenantHeaders(req);
    if (!ctx) throw new ApiError('NOT_FOUND');
    const r = await loadGuestSnapshot(ctx.restaurantId);
    if (!r) throw new ApiError('GUEST_SESSION_EXPIRED');
    if (!r.ok) throw new ApiError(r.error, { retryAfterSeconds: r.retryAfterSeconds });
    return ok(r.data, { revision: r.data.visit.revision });
  } catch (e) {
    return handleError(e);
  }
}
