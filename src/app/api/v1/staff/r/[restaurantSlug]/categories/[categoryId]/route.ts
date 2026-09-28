import { z } from 'zod';
import { CategoryFields } from '@/modules/menu/admin-schemas';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

export const PATCH = staffHandler({
  mutation: true, body: z.strictObject({ version: z.number().int().min(1), fields: CategoryFields.omit({ slug: true }) }),
  run: ({ client, slug, key, params }, b) => call(client, 'staff_save_category', {
    p_restaurant_slug: slug, p_category_id: params.categoryId, p_expected_version: b.version, p_fields: b.fields, p_idempotency_key: key,
  }),
});
