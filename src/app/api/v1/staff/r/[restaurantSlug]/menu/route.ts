import { call, staffHandler } from '@/modules/auth/staff-route.server';

/** Same menu DTO as the public site, used for assisted orders. */
export const GET = staffHandler({ run: ({ client, slug }) => call(client, 'staff_get_menu', { p_restaurant_slug: slug }) });
