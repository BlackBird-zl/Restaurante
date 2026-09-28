import { z } from 'zod';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

const Fields = z.strictObject({ label: z.string().regex(/^[A-Za-z0-9]{1,8}$/), zone: z.string().trim().min(1).max(30), seats: z.number().int().min(1).max(30),
  sortOrder: z.number().int().optional() });

export const GET = staffHandler({ run: ({ client, slug }) => call(client, 'staff_admin_tables', { p_restaurant_slug: slug }) });
export const POST = staffHandler({
  mutation: true, status: 201, body: Fields,
  run: ({ client, slug, key }, b) => call(client, 'staff_save_table', { p_restaurant_slug: slug, p_table_id: null, p_expected_version: null, p_fields: b, p_idempotency_key: key }),
});
