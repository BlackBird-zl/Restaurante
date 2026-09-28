import { z } from 'zod';
import { generateJoinCode, joinDigest } from '@/lib/security/crypto.server';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

const Body = z.strictObject({ expectedRevision: z.number().int().optional() });

export const POST = staffHandler({
  mutation: true, body: Body,
  run: async ({ client, slug, key, params }, body) => {
    const me = await call<{ restaurantId: string }>(client, 'staff_get_me', { p_restaurant_slug: slug });
    const code = generateJoinCode();
    const r = await call<Record<string, unknown> & { joinCodeIssued?: boolean }>(client, 'staff_rotate_join_code', {
      p_restaurant_slug: slug, p_visit_id: params.visitId, p_expected_revision: body.expectedRevision ?? null,
      p_code_digest: joinDigest(me.restaurantId, code), p_idempotency_key: key,
    });
    return r.joinCodeIssued ? { ...r, joinCode: code } : r;
  },
});
