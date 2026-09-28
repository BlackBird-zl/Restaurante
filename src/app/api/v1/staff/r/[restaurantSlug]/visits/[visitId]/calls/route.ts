import { z } from 'zod';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

const Body = z.strictObject({ type: z.enum(['service', 'cutlery', 'help']) });

export const POST = staffHandler({
  mutation: true, status: 201, body: Body,
  run: ({ client, slug, key, params }, body) => call(client, 'staff_create_call', {
    p_restaurant_slug: slug, p_visit_id: params.visitId, p_type: body.type, p_idempotency_key: key,
  }),
});
