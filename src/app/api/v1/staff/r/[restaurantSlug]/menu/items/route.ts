import { ItemFields } from '@/modules/menu/admin-schemas';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

export const GET = staffHandler({ run: ({ client, slug }) => call(client, 'staff_admin_menu', { p_restaurant_slug: slug }) });

export const POST = staffHandler({
  mutation: true, status: 201, body: ItemFields.required({ name: true, slug: true, priceCents: true, categoryId: true, stationId: true }),
  run: ({ client, slug, key }, b) => call(client, 'staff_create_item', { p_restaurant_slug: slug, p_fields: b, p_idempotency_key: key }),
});
