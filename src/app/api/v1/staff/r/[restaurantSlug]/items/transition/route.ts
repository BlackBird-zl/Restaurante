import { z } from 'zod';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

const Body = z.strictObject({
  items: z.array(z.strictObject({ id: z.uuid(), version: z.number().int().min(1) })).min(1).max(50),
  targetState: z.enum(['preparing', 'ready', 'delivering', 'delivered']),
});

/** Atomic batch: every line must match its expected version/state and the actor's scope, or nothing changes. */
export const POST = staffHandler({
  mutation: true, body: Body,
  run: ({ client, slug, key }, body) => call(client, 'staff_transition_items', {
    p_restaurant_slug: slug, p_items: body.items, p_target: body.targetState, p_idempotency_key: key,
  }),
});
