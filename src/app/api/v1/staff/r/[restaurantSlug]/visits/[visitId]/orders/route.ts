import { z } from 'zod';
import { OrderLines } from '@/modules/orders/schemas';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

const Body = z.strictObject({ lines: OrderLines, reason: z.string().trim().max(160).optional() });

/** Assisted order: same engine (create_order_core) as the guest order. */
export const POST = staffHandler({
  mutation: true, status: 201, body: Body,
  run: ({ client, slug, key, params }, body) => call(client, 'staff_create_order', {
    p_restaurant_slug: slug, p_visit_id: params.visitId, p_lines: JSON.parse(JSON.stringify(body.lines)),
    p_assisted_reason: body.reason ?? null, p_idempotency_key: key,
  }),
});
