import 'server-only';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { isSecureCookies } from '@/lib/config/server-env';
import { readQrContext, sha256Hex } from '@/lib/security/crypto.server';
import { privilegedClient } from '@/lib/supabase/privileged';
import { rpc } from '@/lib/supabase/rpc';
import type { GuestSnapshot } from './types';

/** Host-only cookie names per tenant (__Host- prefix requires HTTPS; plain name only on local HTTP). */
export function sessionCookieName(tenantId: string) {
  return `${isSecureCookies() ? '__Host-' : ''}table-session-${tenantId}`;
}
export function contextCookieName(tenantId: string) {
  return `${isSecureCookies() ? '__Host-' : ''}qr-context-${tenantId}`;
}

export function cookieOptions(maxAgeSeconds: number) {
  return { httpOnly: true, secure: isSecureCookies(), sameSite: 'lax' as const, path: '/', maxAge: maxAgeSeconds };
}

export function setSessionCookie(res: NextResponse, tenantId: string, secret: string) {
  res.cookies.set(sessionCookieName(tenantId), secret, cookieOptions(12 * 3600));
}
export function clearSessionCookie(res: NextResponse, tenantId: string) {
  res.cookies.set(sessionCookieName(tenantId), '', cookieOptions(0));
}

/** Hash of the guest secret from the HttpOnly cookie, or null. The secret itself never leaves the server. */
export async function guestSessionHash(tenantId: string): Promise<string | null> {
  const store = await cookies();
  const secret = store.get(sessionCookieName(tenantId))?.value;
  if (!secret || secret.length < 32 || secret.length > 64) return null;
  return sha256Hex(secret);
}

export async function qrContext(tenantId: string) {
  const store = await cookies();
  const ctx = readQrContext(store.get(contextCookieName(tenantId))?.value);
  return ctx && ctx.t === tenantId ? ctx : null;
}

export type SnapshotResult = { ok: true; data: GuestSnapshot } | { ok: false; error: string; retryAfterSeconds?: number };

export async function loadGuestSnapshot(tenantId: string): Promise<SnapshotResult | null> {
  const hash = await guestSessionHash(tenantId);
  if (!hash) return null;
  return rpc<SnapshotResult>(privilegedClient(), 'guest_get_snapshot', { p_restaurant_id: tenantId, p_session_hash: hash });
}

export async function loadQrTable(tenantId: string, qrId: string) {
  return rpc<{ ok: boolean; qrActive: boolean; tableLabel: string; tablePublicSlug: string; visitState: 'none' | 'open' | 'billing' } | null>(
    privilegedClient(), 'guest_qr_context', { p_restaurant_id: tenantId, p_qr_id: qrId });
}
