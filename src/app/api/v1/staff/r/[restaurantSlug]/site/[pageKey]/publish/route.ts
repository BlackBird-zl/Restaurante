import { z } from 'zod';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

export const POST = staffHandler({
  mutation: true, body: z.strictObject({ version: z.number().int().min(1) }),
  run: ({ client, slug, key, params }, b) => call(client, 'staff_publish_page', { p_restaurant_slug: slug, p_page_key: params.pageKey, p_expected_version: b.version, p_idempotency_key: key }),
});
