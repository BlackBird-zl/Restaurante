import 'server-only';
import type { NextRequest } from 'next/server';
import { ApiError, assertSameOrigin, idempotencyKey } from '@/lib/http/server';
import { readTenantHeaders, type PublicTenantContext } from '@/modules/tenancy/context.server';
import { guestSessionHash } from './guest.server';

/** Common preamble for guest mutations: tenant from host, same-origin, idempotency key, session secret. */
export async function guestMutation(req: NextRequest): Promise<{ ctx: PublicTenantContext; hash: string; key: string }> {
  const ctx = await readTenantHeaders(req);
  if (!ctx) throw new ApiError('NOT_FOUND');
  assertSameOrigin(req);
  const key = idempotencyKey(req);
  const hash = await guestSessionHash(ctx.restaurantId);
  if (!hash) throw new ApiError('GUEST_SESSION_EXPIRED');
  return { ctx, hash, key };
}
