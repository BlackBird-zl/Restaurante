import { z } from 'zod';
import { generateJoinCode, joinDigest } from '@/lib/security/crypto.server';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

const Body = z.strictObject({ guestCount: z.number().int().min(1).max(60).optional() });

/** Opens a visit and shows the 6-digit code ONCE (never cached; a replay returns joinCodeUnavailable). */
export const POST = staffHandler({
  mutation: true, status: 201, body: Body,
  run: async ({ client, slug, key, params }, body) => {
    const me = await call<{ restaurantId: string }>(client, 'staff_get_me', { p_restaurant_slug: slug });
    const code = generateJoinCode();
    const r = await call<Record<string, unknown> & { joinCodeIssued?: boolean }>(client, 'staff_open_visit', {
      p_restaurant_slug: slug, p_table_id: params.tableId, p_guest_count: body.guestCount ?? null,
      p_code_digest: joinDigest(me.restaurantId, code), p_idempotency_key: key,
    });
    return r.joinCodeIssued ? { ...r, joinCode: code } : r;
  },
});
