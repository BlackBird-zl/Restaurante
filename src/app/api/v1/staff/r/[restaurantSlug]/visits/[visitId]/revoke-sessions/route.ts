import { call, staffHandler } from '@/modules/auth/staff-route.server';

export const POST = staffHandler({
  mutation: true,
  run: ({ client, slug, key, params }) => call(client, 'staff_revoke_guest_sessions', { p_restaurant_slug: slug, p_visit_id: params.visitId, p_idempotency_key: key }),
});
