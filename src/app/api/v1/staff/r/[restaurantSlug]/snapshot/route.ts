import { z } from 'zod';
import { ApiError } from '@/lib/http/server';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

const Q = z.object({ workspace: z.enum(['floor', 'station', 'cashier', 'me']), station: z.string().regex(/^[A-Za-z0-9]{2,8}$/).optional() });

/** Minimal DTO per role (salão/cozinha/bar/caixa). Station is checked by permission in the RPC, not by the query string. */
export const GET = staffHandler({
  run: async ({ client, slug, req }) => {
    const q = Q.parse(Object.fromEntries(req.nextUrl.searchParams));
    if (q.workspace === 'floor') return call(client, 'staff_get_floor', { p_restaurant_slug: slug });
    if (q.workspace === 'cashier') return call(client, 'staff_get_cashier', { p_restaurant_slug: slug });
    if (q.workspace === 'me') return call(client, 'staff_get_me', { p_restaurant_slug: slug });
    if (!q.station) throw new ApiError('INVALID_INPUT', { field: 'station' });
    return call(client, 'staff_get_station', { p_restaurant_slug: slug, p_station_code: q.station });
  },
});
