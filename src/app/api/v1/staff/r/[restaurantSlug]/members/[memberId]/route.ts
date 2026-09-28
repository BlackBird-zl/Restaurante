import { z } from 'zod';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

const Fields = z.strictObject({
  displayName: z.string().trim().min(1).max(80).optional(), status: z.enum(['active', 'suspended']).optional(),
  roles: z.array(z.enum(['admin', 'floor', 'kitchen', 'bar', 'cashier'])).max(5).optional(), stationIds: z.array(z.uuid()).max(10).optional(),
});

/** Owner/admin limits are enforced in the RPC (no self-elevation, owner protected). */
export const PATCH = staffHandler({
  mutation: true, body: z.strictObject({ version: z.number().int().min(1), fields: Fields }),
  run: ({ client, slug, key, params }, b) => call(client, 'staff_update_member', {
    p_restaurant_slug: slug, p_member_id: params.memberId, p_expected_version: b.version, p_fields: b.fields, p_idempotency_key: key,
  }),
});
