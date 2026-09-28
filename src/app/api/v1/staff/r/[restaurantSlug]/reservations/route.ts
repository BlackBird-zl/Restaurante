import { z } from 'zod';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

const Q = z.object({ status: z.enum(['pending', 'confirmed', 'declined', 'cancelled', 'completed', 'no_show']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

export const GET = staffHandler({
  run: ({ client, slug, req }) => {
    const q = Q.parse(Object.fromEntries(req.nextUrl.searchParams));
    return call(client, 'staff_list_reservations', { p_restaurant_slug: slug, p_status: q.status ?? null, p_from: q.from ?? null, p_to: q.to ?? null });
  },
});
