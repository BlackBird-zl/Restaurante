import { call, staffHandler } from '@/modules/auth/staff-route.server';

/** Pages (draft + published + version), theme and media for the site editor (admin). */
export const GET = staffHandler({ run: ({ client, slug }) => call(client, 'staff_get_site_admin', { p_restaurant_slug: slug }) });
