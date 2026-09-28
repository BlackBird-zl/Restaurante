import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, assertSameOrigin, clientIp, handleError, readJson } from '@/lib/http/server';
import { hashIp, joinDigest, randomToken, sha256Hex } from '@/lib/security/crypto.server';
import { privilegedClient } from '@/lib/supabase/privileged';
import { rpc } from '@/lib/supabase/rpc';
import { readTenantHeaders } from '@/modules/tenancy/context.server';
import { qrContext, setSessionCookie } from '@/modules/tables/guest.server';
import { randomUUID } from 'node:crypto';

const Body = z.strictObject({ code: z.string().regex(/^\d{6}$/) });

/**
 * Join with the 6-digit code (Arquitetura §8.2 steps 4–6). Requires the signed QR context
 * cookie. Creates a new guest session secret (HttpOnly cookie, up to 12 h). Not cached for
 * idempotency on purpose: a lost response may create another valid session (documented).
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await readTenantHeaders(req);
    if (!ctx) throw new ApiError('NOT_FOUND');
    assertSameOrigin(req);
    const qr = await qrContext(ctx.restaurantId);
    if (!qr) throw new ApiError('QR_INVALID', { reason: 'scan_again' });
    const { code } = await readJson(req, Body);
    const secret = randomToken(32);
    const r = await rpc<{ ok: boolean; error?: string; retryAfterSeconds?: number; attemptsLeft?: number;
      tableLabel?: string; sessionPublicId?: string; visitId?: string; expiresAt?: string }>(privilegedClient(), 'guest_join_visit', {
      p_restaurant_id: ctx.restaurantId, p_qr_id: qr.q, p_context_nonce: qr.n, p_code_digest: joinDigest(ctx.restaurantId, code),
      p_session_hash: sha256Hex(secret), p_ip_hash: hashIp(clientIp(req)),
    });
    if (!r.ok) throw new ApiError(r.error ?? 'INVALID_CODE', { retryAfterSeconds: r.retryAfterSeconds, attemptsLeft: r.attemptsLeft });
    const res = NextResponse.json(
      { data: { tableLabel: r.tableLabel, sessionPublicId: r.sessionPublicId, visitId: r.visitId, expiresAt: r.expiresAt },
        meta: { requestId: randomUUID(), serverTime: new Date().toISOString() } },
      { status: 201, headers: { 'Cache-Control': 'private, no-store' } },
    );
    setSessionCookie(res, ctx.restaurantId, secret);
    return res;
  } catch (e) {
    return handleError(e);
  }
}
