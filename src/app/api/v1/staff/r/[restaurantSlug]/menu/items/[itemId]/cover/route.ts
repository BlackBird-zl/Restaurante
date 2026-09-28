import { z } from 'zod';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

export const POST = staffHandler({
  mutation: true, body: z.strictObject({ mediaId: z.uuid().nullable() }),
  run: ({ client, slug, key, params }, b) => call(client, 'staff_set_item_cover', {
    p_restaurant_slug: slug, p_item_id: params.itemId, p_media_id: b.mediaId, p_idempotency_key: key,
  }),
});
