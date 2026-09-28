import { z } from 'zod';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

const Fields = z.strictObject({ code: z.string().regex(/^[A-Z0-9]{2,8}$/), name: z.string().trim().min(1).max(40), kind: z.enum(['kitchen', 'bar']),
  targetMinutes: z.number().int().min(1).max(120), sortOrder: z.number().int().optional() });

export const GET = staffHandler({ run: ({ client, slug }) => call(client, 'staff_admin_stations', { p_restaurant_slug: slug }) });
export const POST = staffHandler({
  mutation: true, status: 201, body: Fields,
  run: ({ client, slug, key }, b) => call(client, 'staff_save_station', { p_restaurant_slug: slug, p_station_id: null, p_expected_version: null, p_fields: b, p_idempotency_key: key }),
});
