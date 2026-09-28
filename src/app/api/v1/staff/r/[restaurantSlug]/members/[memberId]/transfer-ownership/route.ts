import { call, staffHandler } from '@/modules/auth/staff-route.server';

export const POST = staffHandler({
  mutation: true,
  run: ({ client, slug, key, params }) => call(client, 'staff_transfer_ownership', { p_restaurant_slug: slug, p_member_id: params.memberId, p_idempotency_key: key }),
});
