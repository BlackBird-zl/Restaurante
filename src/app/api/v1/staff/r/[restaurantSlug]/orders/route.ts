import { z } from 'zod';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

const Q = z.object({ cursorAt: z.string().optional(), cursorId: z.uuid().optional(), limit: z.coerce.number().int().min(1).max(100).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

export const GET = staffHandler({
  run: ({ client, slug, req }) => {
    const q = Q.parse(Object.fromEntries(req.nextUrl.searchParams));
    return call(client, 'staff_list_orders', { p_restaurant_slug: slug, p_cursor_at: q.cursorAt ?? null, p_cursor_id: q.cursorId ?? null, p_limit: q.limit ?? 50, p_business_date: q.date ?? null });
  },
});
