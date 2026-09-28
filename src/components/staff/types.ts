import type { BillStatus, CallStatus, CallType, LineStatus } from '@/modules/orders/status';

export type FloorCall = {
  id: string; type: CallType; status: CallStatus; createdAt: string; claimedAt: string | null; version: number;
  claimedBy: string | null; tableLabel: string; visitId: string; claimedByMe: boolean;
};
export type ReadyItem = {
  id: string; version: number; status: 'ready' | 'delivering'; name: string; quantity: number; note: string | null; tableLabel: string;
  visitId: string; orderNumber: number; stationCode: string; stationKind: 'kitchen' | 'bar'; readyAt: string; pickedUpAt: string | null;
  deliveryMemberId: string | null; deliveryMemberName: string | null; mine: boolean;
};
export type FloorTable = {
  id: string; label: string; zone: string; seats: number; state: 'free' | 'open' | 'billing';
  visit: null | { id: string; openedAt: string; revision: number; joinCodeExpiresAt: string; billId: string; billStatus: BillStatus;
    billVersion: number; totalCents: number; activeCalls: number; pendingLines: number; guestSessions: number };
};
export type FloorSnapshot = {
  serverTime: string; orderingMode: string; me: { memberId: string; displayName: string; roles: string[] };
  calls: FloorCall[]; readyItems: ReadyItem[]; tables: FloorTable[];
  reservationsToday: { id: string; reference: string; name: string; partySize: number; scheduledAt: string; status: string }[];
  pendingReservations: number; members: { id: string; displayName: string }[];
};
export type VisitLine = {
  id: string; version: number; orderNumber: number; submittedAt: string; source: 'guest' | 'staff'; name: string; quantity: number;
  unitPriceCents: number; lineTotalCents: number; status: LineStatus; note: string | null; stationCode: string; cancelReason: string | null;
  deliveryMemberName: string | null;
};
export type VisitDetail = {
  serverTime: string;
  visit: { id: string; tableId: string; tableLabel: string; status: 'open' | 'billing' | 'closed'; openedAt: string; revision: number; guestCount: number | null; joinCodeExpiresAt: string; closedAt: string | null };
  bill: { id: string; status: BillStatus; version: number; requestCycle: number; requestedAt: string | null; totalCents: number; pendingLines: number; settledAt: string | null };
  lines: VisitLine[];
  calls: { id: string; type: CallType; status: CallStatus; createdAt: string; claimedBy: string | null }[];
  payment: null | { method: string; amountCents: number; recordedAt: string; recordedBy: string };
};
export type StationTicket = {
  id: string; orderNumber: number; tableLabel: string; submittedAt: string;
  lines: { id: string; version: number; name: string; quantity: number; note: string | null; status: LineStatus; preparedStartedAt: string | null; readyAt: string | null }[];
};
export type StationSnapshot = {
  serverTime: string;
  station: { id: string; code: string; name: string; kind: 'kitchen' | 'bar'; targetMinutes: number; active: boolean };
  tickets: StationTicket[];
  recent: { orderNumber: number; tableLabel: string; name: string; quantity: number; status: LineStatus; readyAt: string }[];
  products: { id: string; name: string; isAvailable: boolean; version: number }[];
};
export type CashierBill = {
  id: string; visitId: string; status: BillStatus; version: number; requestCycle: number; requestedAt: string | null; totalCents: number;
  pendingLines: number; tableLabel: string; openedAt: string;
};
export type CashierSnapshot = {
  serverTime: string; businessDate: string; receivedTodayCents: number; bills: CashierBill[];
  settledToday: { billId: string; visitId: string; tableLabel: string; totalCents: number; method: string; recordedAt: string; recordedBy: string }[];
};
