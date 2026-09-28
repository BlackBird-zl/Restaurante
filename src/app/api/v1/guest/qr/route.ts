import { NextResponse, type NextRequest } from 'next/server';
import { randomToken, hashIp, sha256Hex, signQrContext } from '@/lib/security/crypto.server';
import { clientIp } from '@/lib/http/server';
import { privilegedClient } from '@/lib/supabase/privileged';
import { rpc } from '@/lib/supabase/rpc';
import { readTenantHeaders } from '@/modules/tenancy/context.server';
import { publicUrl } from '@/modules/tenancy/public-url';
import { contextCookieName, cookieOptions } from '@/modules/tables/guest.server';

/**
 * QR bootstrap (Arquitetura §8.2 step 1–2). GET never opens a visit or creates orders.
 * Validates the token, stores a signed 10-minute context cookie and 303-redirects to a URL
 * without the token. Response is no-store with no-referrer; the token is never logged.
 */
export async function GET(req: NextRequest) {
  const ctx = await readTenantHeaders(req);
  if (!ctx) return new NextResponse('Not found', { status: 404 });
  const label = (req.headers.get('x-ros-qr-label') ?? '').toLowerCase();
  const token = req.nextUrl.searchParams.get('q') ?? '';
  const target = new URL(publicUrl(ctx.basePath, `/mesa/${encodeURIComponent(label)}`), ctx.origin);
  const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' };
  let state = 'qr-invalido';
  if (/^[A-Za-z0-9_-]{20,100}$/.test(token) && /^[a-z0-9]{1,8}$/.test(label)) {
    try {
      const r = await rpc<{ ok: boolean; error?: string; qrId?: string; tablePublicSlug?: string }>(privilegedClient(), 'guest_resolve_qr', {
        p_restaurant_id: ctx.restaurantId, p_token_hash: sha256Hex(token), p_ip_hash: hashIp(clientIp(req)),
      });
      if (r.ok && r.qrId && r.tablePublicSlug === label) {
        const res = NextResponse.redirect(target, { status: 303, headers });
        res.cookies.set(contextCookieName(ctx.restaurantId), signQrContext({ q: r.qrId, t: ctx.restaurantId, n: randomToken(12) }), cookieOptions(600));
        return res;
      }
      state = r.error === 'RATE_LIMITED' ? 'limite' : r.error === 'QR_REVOKED' || r.error === 'TABLE_INACTIVE' ? 'qr-revogado' : 'qr-invalido';
    } catch {
      state = 'indisponivel';
    }
  }
  target.searchParams.set('estado', state);
  return NextResponse.redirect(target, { status: 303, headers });
}
