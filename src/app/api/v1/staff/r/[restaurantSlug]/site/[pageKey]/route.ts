import { z } from 'zod';
import { ApiError } from '@/lib/http/server';
import { PAGE_SCHEMAS } from '@/modules/site/schemas';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

/** Save draft (does not change the public site). */
export const PATCH = staffHandler({
  mutation: true, body: z.strictObject({ version: z.number().int().min(1), draft: z.unknown() }),
  run: ({ client, slug, key, params }, b) => {
    const schema = PAGE_SCHEMAS[params.pageKey as keyof typeof PAGE_SCHEMAS];
    if (!schema) throw new ApiError('NOT_FOUND');
    const draft = schema.parse(b.draft);
    return call(client, 'staff_save_page_draft', { p_restaurant_slug: slug, p_page_key: params.pageKey, p_expected_version: b.version, p_draft: draft, p_idempotency_key: key });
  },
});
