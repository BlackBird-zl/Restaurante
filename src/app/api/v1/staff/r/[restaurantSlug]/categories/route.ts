import { CategoryFields } from '@/modules/menu/admin-schemas';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

export const POST = staffHandler({
  mutation: true, status: 201, body: CategoryFields.required({ slug: true, name: true }),
  run: ({ client, slug, key }, b) => call(client, 'staff_save_category', { p_restaurant_slug: slug, p_category_id: null, p_expected_version: null, p_fields: b, p_idempotency_key: key }),
});
