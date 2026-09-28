import { z } from 'zod';
import { ALLERGEN_CODES } from './types';

const slug = z.string().regex(/^[a-z0-9]([a-z0-9-]{0,78}[a-z0-9])?$/, 'Use minúsculas, algarismos e hífens.');

/** Allowlist of editable product fields (mirrors app_private.apply_item_fields). */
export const ItemFields = z.strictObject({
  name: z.string().trim().min(1).max(80).optional(),
  slug: slug.optional(),
  description: z.string().trim().max(500).optional(),
  ingredients: z.string().trim().max(500).optional(),
  allergens: z.array(z.enum(ALLERGEN_CODES as [string, ...string[]])).max(14).optional(),
  isVegetarian: z.boolean().optional(),
  containsAlcohol: z.boolean().optional(),
  priceCents: z.number().int().min(1).max(100000).optional(),
  isVisible: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  categoryId: z.uuid().optional(),
  stationId: z.uuid().optional(),
});

export const CategoryFields = z.strictObject({
  slug: z.string().regex(/^[a-z0-9]([a-z0-9-]{0,58}[a-z0-9])?$/).optional(),
  name: z.string().trim().min(1).max(60).optional(),
  description: z.string().trim().max(300).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isVisible: z.boolean().optional(),
  archived: z.boolean().optional(),
});
