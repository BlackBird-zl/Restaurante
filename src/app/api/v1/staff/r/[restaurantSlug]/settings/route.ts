import { z } from 'zod';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

const Hours = z.record(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']), z.array(z.tuple([z.string().regex(/^\d{2}:\d{2}$/), z.string().regex(/^\d{2}:\d{2}$/)])).max(3));
const Contacts = z.strictObject({
  phone: z.string().trim().max(30).nullable().optional(), email: z.email().nullable().optional(), addressLine: z.string().trim().max(120).nullable().optional(),
  city: z.string().trim().max(80).nullable().optional(), mapUrl: z.url().startsWith('https://').nullable().optional(), instagram: z.string().trim().max(60).nullable().optional(),
});
const Patch = z.strictObject({ orderingMode: z.enum(['open', 'paused', 'closed']).optional(), weeklyHours: Hours.optional(), publicContacts: Contacts.optional(),
  restaurantName: z.string().trim().min(1).max(80).optional() });

export const GET = staffHandler({ run: ({ client, slug }) => call(client, 'staff_get_settings', { p_restaurant_slug: slug }) });
export const PATCH = staffHandler({
  mutation: true, body: z.strictObject({ version: z.number().int().min(1), patch: Patch }),
  run: ({ client, slug, key }, b) => call(client, 'staff_update_settings', { p_restaurant_slug: slug, p_expected_version: b.version, p_patch: JSON.parse(JSON.stringify(b.patch)), p_idempotency_key: key }),
});
