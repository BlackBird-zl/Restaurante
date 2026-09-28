import { z } from 'zod';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

const Body = z.strictObject({ version: z.number().int().min(1), reason: z.string().trim().min(3).max(200) });

export const POST = staffHandler({
  mutation: true, body: Body,
  run: ({ client, slug, key, params }, body) => call(client, 'staff_cancel_item', {
    p_restaurant_slug: slug, p_item_id: params.itemId, p_version: body.version, p_reason: body.reason, p_idempotency_key: key,
  }),
});
