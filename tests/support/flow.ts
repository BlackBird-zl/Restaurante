import { expect } from 'vitest';
import { Client, PATIO_HOST, staffApi } from './http';
import { tableQrUrl } from './qr';

export const PATIO = 'patio-do-ferro';

export type Floor = { tables: { id: string; label: string; state: 'free' | 'open' | 'billing'; visit: null | { id: string; billId: string; billVersion: number; revision: number } }[] };

export async function floor(staff: Client, slug = PATIO): Promise<Floor> {
  const r = await staff.get(`${staffApi(slug)}/snapshot?workspace=floor`);
  expect(r.status).toBe(200);
  return r.json.data as Floor;
}

export async function freeTable(staff: Client, exclude: string[] = [], slug = PATIO) {
  const f = await floor(staff, slug);
  const t = f.tables.find((x) => x.state === 'free' && !exclude.includes(x.label));
  if (!t) throw new Error('no free table left');
  return t;
}

/** Floor opens the table (code shown once) and a guest joins through the real QR + code flow. */
export async function openAndJoin(floorStaff: Client, admin: Client, tableId: string, host = PATIO_HOST, slug = PATIO) {
  const open = await floorStaff.post(`${staffApi(slug)}/tables/${tableId}/visits`, { guestCount: 2 });
  expect(open.status, JSON.stringify(open.json)).toBe(201);
  const code = open.json.data.joinCode as string;
  expect(code).toMatch(/^\d{6}$/);
  const qr = await tableQrUrl(admin, slug, tableId);
  const guest = new Client(host);
  const boot = await guest.get(`${qr.pathname}${qr.search}`);
  expect(boot.status).toBe(303);
  expect(String(boot.headers.location)).not.toContain('q=');
  expect(String(boot.headers['set-cookie'] ?? '')).toMatch(/qr-context-/);
  const join = await guest.post('/api/v1/guest/join', { code });
  expect(join.status, JSON.stringify(join.json)).toBe(201);
  return { guest, code, visitId: open.json.data.visit?.id ?? join.json.data.visitId as string, qr };
}

export async function menu(host = PATIO_HOST) {
  const r = await new Client(host).get('/api/v1/public/menu');
  expect(r.status).toBe(200);
  return r.json.data as { items: { id: string; name: string; priceCents: number; version: number; isAvailable: boolean }[] };
}

export function line(item: { id: string; priceCents: number; version: number }, quantity = 1) {
  return { itemId: item.id, quantity, expectedItemVersion: item.version, expectedPriceCents: item.priceCents };
}

/** Moves every open line of a visit to delivered (admin acts on all stations). */
export async function deliverAll(admin: Client, visitId: string, slug = PATIO) {
  for (const target of ['preparing', 'ready', 'delivering', 'delivered'] as const) {
    const v = await admin.get(`${staffApi(slug)}/visits/${visitId}`);
    expect(v.status).toBe(200);
    const from = { preparing: ['pending'], ready: ['preparing'], delivering: ['ready'], delivered: ['delivering'] }[target];
    const items = (v.json.data.lines as { id: string; version: number; status: string }[]).filter((l) => from.includes(l.status)).map((l) => ({ id: l.id, version: l.version }));
    if (!items.length) continue;
    const r = await admin.post(`${staffApi(slug)}/items/transition`, { items, targetState: target });
    expect(r.status, JSON.stringify(r.json)).toBe(200);
  }
}
