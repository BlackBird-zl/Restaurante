import { z } from 'zod';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

const Fields = z.strictObject({ label: z.string().regex(/^[A-Za-z0-9]{1,8}$/).optional(), zone: z.string().trim().min(1).max(30).optional(),
  seats: z.number().int().min(1).max(30).optional(), sortOrder: z.number().int().optional(), active: z.boolean().optional(), archived: z.boolean().optional() });

export const PATCH = staffHandler({
  mutation: true, body: z.strictObject({ version: z.number().int().min(1), fields: Fields }),
  run: ({ client, slug, key, params }, b) => call(client, 'staff_save_table', {
    p_restaurant_slug: slug, p_table_id: params.tableId, p_expected_version: b.version, p_fields: b.fields, p_idempotency_key: key,
  }),
});
