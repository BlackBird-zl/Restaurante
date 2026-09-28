import { z } from 'zod';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

const Body = z.strictObject({ mode: z.enum(['open', 'paused', 'closed']) });

export const POST = staffHandler({
  mutation: true, body: Body,
  run: ({ client, slug, key }, b) => call(client, 'staff_set_ordering_mode', { p_restaurant_slug: slug, p_mode: b.mode, p_idempotency_key: key }),
});
