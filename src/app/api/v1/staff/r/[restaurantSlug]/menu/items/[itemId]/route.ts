import { z } from 'zod';
import { ItemFields } from '@/modules/menu/admin-schemas';
import { call, staffHandler } from '@/modules/auth/staff-route.server';

const Patch = z.strictObject({ version: z.number().int().min(1), patch: ItemFields });

/** Allowlisted fields only; expected version prevents silent overwrites (QA-M02). */
export const PATCH = staffHandler({
  mutation: true, body: Patch,
  run: ({ client, slug, key, params }, b) => call(client, 'staff_update_item', {
    p_restaurant_slug: slug, p_item_id: params.itemId, p_expected_version: b.version, p_patch: b.patch, p_idempotency_key: key,
  }),
});

/** DELETE = archive (history kept; product disappears from the public menu). */
export const DELETE = staffHandler({
  mutation: true, body: z.strictObject({ version: z.number().int().min(1) }),
  run: ({ client, slug, key, params }, b) => call(client, 'staff_archive_item', {
    p_restaurant_slug: slug, p_item_id: params.itemId, p_expected_version: b.version, p_idempotency_key: key,
  }),
});
