import type { CallStatus, CallType, LineStatus, OrderStatus } from '@/modules/orders/status';

export type GuestLine = { id: string; name: string; quantity: number; unitPriceCents: number; status: LineStatus; note: string | null };
export type GuestOrder = { id: string; number: number; submittedAt: string; mine: boolean; status: OrderStatus; lines: GuestLine[] };
export type GuestSnapshot = {
  table: { label: string };
  session: { publicId: string; expiresAt: string };
  visit: { id: string; status: 'open' | 'billing' | 'closed'; revision: number };
  orderingMode: 'open' | 'paused' | 'closed';
  bill: { status: 'open' | 'requested' | 'settled' | 'void'; requestCycle: number; totalCents: number };
  orders: GuestOrder[];
  calls: { id: string; type: CallType; status: CallStatus; createdAt: string; claimedAt: string | null }[];
  serverTime: string;
};

export type CartLine = {
  key: string; // itemId + note
  itemId: string; slug: string; name: string; quantity: number; note: string;
  expectedPriceCents: number; expectedItemVersion: number;
};
