import { z } from 'zod';
import { ThemeTokensSchema } from '@/modules/site/schemas';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

export const PATCH = staffHandler({
  mutation: true,
  body: z.strictObject({ version: z.number().int().min(1), preset: z.enum(['casa-editorial', 'balcao-claro', 'noite-grafica']), tokens: ThemeTokensSchema, publish: z.boolean() }),
  run: ({ client, slug, key }, b) => call(client, 'staff_save_theme', {
    p_restaurant_slug: slug, p_expected_version: b.version, p_preset: b.preset, p_tokens: b.tokens, p_publish: b.publish, p_idempotency_key: key,
  }),
});
