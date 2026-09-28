import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { handleError, ok, readJson } from '@/lib/http/server';
import { privilegedClient } from '@/lib/supabase/privileged';
import { rpc } from '@/lib/supabase/rpc';
import { guestMutation } from '@/modules/tables/guest-api.server';

/** Only floor call types; "bill" goes through the bill engine, drinks go to the menu (never a vague bar call). */
const Body = z.strictObject({ type: z.enum(['service', 'cutlery', 'help']) });

export async function POST(req: NextRequest) {
  try {
    const { ctx, hash, key } = await guestMutation(req);
    const { type } = await readJson(req, Body);
    const data = await rpc(privilegedClient(), 'guest_create_call', {
      p_restaurant_id: ctx.restaurantId, p_session_hash: hash, p_type: type, p_idempotency_key: key,
    });
    return ok(data, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
