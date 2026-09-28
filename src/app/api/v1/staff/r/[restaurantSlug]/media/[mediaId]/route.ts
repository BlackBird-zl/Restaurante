import { z } from 'zod';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

const Fields = z.strictObject({ alt: z.string().trim().max(160).optional(), focalX: z.number().min(0).max(1).optional(), focalY: z.number().min(0).max(1).optional(),
  approved: z.boolean().optional(), archived: z.boolean().optional() });

export const PATCH = staffHandler({
  mutation: true, body: Fields,
  run: ({ client, slug, key, params }, b) => call(client, 'staff_update_media', { p_restaurant_slug: slug, p_media_id: params.mediaId, p_fields: b, p_idempotency_key: key }),
});
