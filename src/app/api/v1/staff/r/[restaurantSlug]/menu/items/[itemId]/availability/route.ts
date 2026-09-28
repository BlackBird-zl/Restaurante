import { z } from 'zod';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

const Body = z.strictObject({ available: z.boolean(), version: z.number().int().min(1) });

/** Admin, or kitchen/bar for products of their own station (checked in the RPC). */
export const PATCH = staffHandler({
  mutation: true, body: Body,
  run: ({ client, slug, key, params }, b) => call(client, 'staff_set_availability', {
    p_restaurant_slug: slug, p_item_id: params.itemId, p_available: b.available, p_version: b.version, p_idempotency_key: key,
  }),
});
