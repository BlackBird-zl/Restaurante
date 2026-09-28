import { z } from 'zod';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

const Body = z.strictObject({
  items: z.array(z.strictObject({ id: z.uuid(), version: z.number().int().min(1) })).min(1).max(50),
  memberId: z.uuid(), reason: z.string().trim().min(3).max(200),
});

export const POST = staffHandler({
  mutation: true, body: Body,
  run: ({ client, slug, key }, body) => call(client, 'staff_reassign_delivery', {
    p_restaurant_slug: slug, p_items: body.items, p_member_id: body.memberId, p_reason: body.reason, p_idempotency_key: key,
  }),
});
