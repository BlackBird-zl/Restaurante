import { z } from 'zod';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

const Body = z.strictObject({
  target: z.enum(['confirmed', 'declined', 'cancelled', 'completed', 'no_show']),
  version: z.number().int().min(1), contactConfirmed: z.boolean().optional(), internalNote: z.string().trim().max(300).optional(),
});

export const POST = staffHandler({
  mutation: true, body: Body,
  run: ({ client, slug, key, params }, b) => call(client, 'staff_transition_reservation', {
    p_restaurant_slug: slug, p_reservation_id: params.reservationId, p_target: b.target, p_version: b.version,
    p_contact_confirmed: b.contactConfirmed ?? false, p_internal_note: b.internalNote ?? null, p_idempotency_key: key,
  }),
});
