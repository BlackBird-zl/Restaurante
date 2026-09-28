import { z } from 'zod';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

const Fields = z.strictObject({ name: z.string().trim().min(1).max(40).optional(), targetMinutes: z.number().int().min(1).max(120).optional(),
  sortOrder: z.number().int().optional(), active: z.boolean().optional() });

export const PATCH = staffHandler({
  mutation: true, body: z.strictObject({ version: z.number().int().min(1), fields: Fields }),
  run: ({ client, slug, key, params }, b) => call(client, 'staff_save_station', {
    p_restaurant_slug: slug, p_station_id: params.stationId, p_expected_version: b.version, p_fields: b.fields, p_idempotency_key: key,
  }),
});
