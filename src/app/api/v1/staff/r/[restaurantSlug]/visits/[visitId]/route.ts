import { call, staffHandler } from '@/modules/auth/staff-route.server';

export const GET = staffHandler({
  run: ({ client, slug, params }) => call(client, 'staff_get_visit', { p_restaurant_slug: slug, p_visit_id: params.visitId }),
});
