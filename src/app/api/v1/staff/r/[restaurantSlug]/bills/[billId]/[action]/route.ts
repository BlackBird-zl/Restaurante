import { z } from 'zod';
import { ApiError } from '@/lib/http/server';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

const Body = z.strictObject({
  version: z.number().int().min(1),
  expectedTotalCents: z.number().int().min(0).max(10_000_000).optional(),
  method: z.enum(['cash', 'external_card', 'external_mbway']).optional(),
  reason: z.string().trim().max(200).optional(),
  note: z.string().trim().max(200).optional(),
});

/** request / reopen / settle / void. Settle compares version AND total seen by the cashier, atomically. */
export const POST = staffHandler({
  mutation: true, body: Body,
  run: ({ client, slug, key, params }, b) => {
    const base = { p_restaurant_slug: slug, p_bill_id: params.billId, p_idempotency_key: key };
    switch (params.action) {
      case 'request': return call(client, 'staff_request_bill', { ...base, p_expected_version: b.version });
      case 'reopen': return call(client, 'staff_reopen_bill', { ...base, p_version: b.version, p_reason: b.reason ?? '' });
      case 'void': return call(client, 'staff_void_bill', { ...base, p_version: b.version, p_reason: b.reason ?? '' });
      case 'settle':
        if (b.expectedTotalCents === undefined || !b.method) throw new ApiError('INVALID_INPUT', { field: 'method' });
        return call(client, 'staff_settle_bill', { ...base, p_version: b.version, p_expected_total_cents: b.expectedTotalCents, p_method: b.method, p_note: b.note ?? null });
      default: throw new ApiError('NOT_FOUND');
    }
  },
});
