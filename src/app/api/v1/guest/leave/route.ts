import { NextResponse, type NextRequest } from 'next/server';
import { ApiError, assertSameOrigin, handleError } from '@/lib/http/server';
import { readTenantHeaders } from '@/modules/tenancy/context.server';
import { clearSessionCookie } from '@/modules/tables/guest.server';

/** Removes this device's table cookie (used before switching tables). Does not affect the visit. */
export async function POST(req: NextRequest) {
  try {
    const ctx = await readTenantHeaders(req);
    if (!ctx) throw new ApiError('NOT_FOUND');
    assertSameOrigin(req);
    const res = NextResponse.json({ data: { ok: true }, meta: { serverTime: new Date().toISOString() } }, { headers: { 'Cache-Control': 'no-store' } });
    clearSessionCookie(res, ctx.restaurantId);
    return res;
  } catch (e) {
    return handleError(e);
  }
}
