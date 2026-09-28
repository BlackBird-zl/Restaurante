import { z } from 'zod';

/** Strict order-line schema shared by guest and assisted orders: price, total, station, tenant
 *  or status fields are rejected (QA-O02). The database validates again. */
export const OrderLines = z.array(z.strictObject({
  itemId: z.uuid(),
  quantity: z.number().int().min(1).max(10),
  note: z.string().trim().max(160).optional(),
  expectedItemVersion: z.number().int().min(1),
  expectedPriceCents: z.number().int().min(1).max(100000),
})).min(1).max(20);

export type OrderLineInput = z.infer<typeof OrderLines>[number];
