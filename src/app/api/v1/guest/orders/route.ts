import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleError, ok, readJson } from '@/lib/http/server';
import { privilegedClient } from '@/lib/supabase/privileged';
import { rpc } from '@/lib/supabase/rpc';
import { guestMutation } from '@/modules/tables/guest-api.server';
import { OrderLines } from '@/modules/orders/schemas';



const Body = z.strictObject({ lines: OrderLines });

export async function POST(req: NextRequest) {
  try {
    const { ctx, hash, key } = await guestMutation(req);
    const { lines } = await readJson(req, Body);
    const payload = lines.map((l) => ({ ...l, note: l.note ? l.note : undefined }));
    const data = await rpc(privilegedClient(), 'guest_create_order', {
      p_restaurant_id: ctx.restaurantId, p_session_hash: hash, p_lines: JSON.parse(JSON.stringify(payload)), p_idempotency_key: key,
    });
    return ok(data, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
