import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleError, ok, readJson } from '@/lib/http/server';
import { privilegedClient } from '@/lib/supabase/privileged';
import { rpc } from '@/lib/supabase/rpc';
import { guestMutation } from '@/modules/tables/guest-api.server';

const Body = z.strictObject({ expectedVisitRevision: z.number().int().optional() });

/** Requesting the bill is NOT a payment: it blocks new orders and calls the team. */
export async function POST(req: NextRequest) {
  try {
    const { ctx, hash, key } = await guestMutation(req);
    await readJson(req, Body);
    const data = await rpc(privilegedClient(), 'guest_request_bill', {
      p_restaurant_id: ctx.restaurantId, p_session_hash: hash, p_idempotency_key: key,
    });
    return ok(data);
  } catch (e) {
    return handleError(e);
  }
}
