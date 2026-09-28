import { z } from 'zod';
import { ApiError } from '@/lib/http/server';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

const Body = z.strictObject({
  version: z.number().int().min(1),
  outcome: z.enum(['completed', 'cancelled']).optional(),
  note: z.string().trim().max(200).optional(),
  memberId: z.uuid().optional(),
  reason: z.string().trim().max(200).optional(),
});

export const POST = staffHandler({
  mutation: true, body: Body,
  run: ({ client, slug, key, params }, b) => {
    const base = { p_restaurant_slug: slug, p_call_id: params.callId, p_idempotency_key: key };
    switch (params.action) {
      case 'claim': return call(client, 'staff_claim_call', { ...base, p_expected_version: b.version });
      case 'resolve': return call(client, 'staff_resolve_call', { ...base, p_version: b.version, p_outcome: b.outcome ?? 'completed', p_note: b.note ?? null });
      case 'reassign':
        if (!b.memberId || !b.reason) throw new ApiError('INVALID_INPUT', { field: 'memberId' });
        return call(client, 'staff_reassign_call', { ...base, p_version: b.version, p_member_id: b.memberId, p_reason: b.reason });
      default: throw new ApiError('NOT_FOUND');
    }
  },
});
