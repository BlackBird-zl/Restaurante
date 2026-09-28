import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, assertSameOrigin, clientIp, handleError, idempotencyKey, ok, readJson } from '@/lib/http/server';
import { privilegedClient } from '@/lib/supabase/privileged';
import { rpc } from '@/lib/supabase/rpc';
import { hashIp } from '@/lib/security/crypto.server';
import { readTenantHeaders } from '@/modules/tenancy/context.server';

const Body = z.strictObject({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(160).optional(),
  phone: z.string().trim().max(20).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  partySize: z.number().int().min(1).max(12),
  note: z.string().trim().max(300).optional(),
  website: z.string().max(200).optional(),
  elapsedMs: z.number().int().nonnegative().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await readTenantHeaders(req);
    if (!ctx) throw new ApiError('NOT_FOUND');
    assertSameOrigin(req);
    const key = idempotencyKey(req);
    const body = await readJson(req, Body);
    // Honeypot and minimum fill time: rejected explicitly (no fake success).
    if (body.website || (body.elapsedMs !== undefined && body.elapsedMs < 2500)) {
      throw new ApiError('INVALID_INPUT', { reason: 'rejected' });
    }
    if (!body.email && !body.phone) throw new ApiError('INVALID_INPUT', { field: 'contact' });
    const payload = {
      name: body.name, email: body.email, phone: body.phone, date: body.date, time: body.time,
      partySize: body.partySize, note: body.note,
    };
    const data = await rpc(privilegedClient(), 'guest_create_reservation', {
      p_restaurant_id: ctx.restaurantId, p_payload: JSON.parse(JSON.stringify(payload)),
      p_idempotency_key: key, p_ip_hash: hashIp(clientIp(req)),
    });
    return ok(data, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
