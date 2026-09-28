import { z } from 'zod';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

const Q = z.object({ start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

export const GET = staffHandler({
  run: ({ client, slug, req }) => {
    const q = Q.parse(Object.fromEntries(req.nextUrl.searchParams));
    return call(client, 'staff_get_analytics', { p_restaurant_slug: slug, p_from: q.start ?? null, p_to: q.end ?? null });
  },
});
