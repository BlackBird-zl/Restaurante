import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { Client, PATIO_HOST, staffApi, staffLogin } from '../support/http';
import { freeTable, line, menu, openAndJoin, PATIO } from '../support/flow';

let admin: Client; let rui: Client;
let guest: Client; let visitId: string; let guestB: Client; let guestC: Client;
let items: Awaited<ReturnType<typeof menu>>['items'];

beforeAll(async () => {
  admin = await staffLogin('marta@patio.example');
  rui = await staffLogin('rui@patio.example');
  items = (await menu()).items.filter((i) => i.isAvailable);
  const t = await freeTable(rui);
  ({ guest, visitId } = await openAndJoin(rui, admin, t.id));
  // Guests may submit 3 orders/min per session (anti-abuse), so independent scenarios use separate tables.
  guestB = (await openAndJoin(rui, admin, (await freeTable(rui)).id)).guest;
  guestC = (await openAndJoin(rui, admin, (await freeTable(rui)).id)).guest;
});

describe('QR bootstrap and join (QA-Q01..Q06)', () => {
  it('invalid QR token never reveals anything and redirects neutrally', async () => {
    const r = await new Client(PATIO_HOST).get('/mesa/14?q=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    expect(r.status).toBe(303);
    expect(String(r.headers.location)).toMatch(/estado=qr-invalido/);
    expect(String(r.headers['set-cookie'] ?? '')).not.toMatch(/qr-context/);
  });
  it('join without QR context is refused', async () => {
    const r = await new Client(PATIO_HOST).post('/api/v1/guest/join', { code: '123456' });
    expect(r.status).toBe(404);
    expect(r.json.error.code).toBe('QR_INVALID');
  });
  it('wrong codes are counted and eventually rate limited', async () => {
    const t = await freeTable(rui);
    const open = await rui.post(`${staffApi(PATIO)}/tables/${t.id}/visits`, {});
    expect(open.status).toBe(201);
    const real = open.json.data.joinCode as string;
    const { tableQrUrl } = await import('../support/qr');
    const qr = await tableQrUrl(admin, PATIO, t.id);
    const g = new Client(PATIO_HOST);
    await g.get(`${qr.pathname}${qr.search}`);
    const wrong = real === '000000' ? '000001' : '000000';
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) statuses.push((await g.post('/api/v1/guest/join', { code: wrong })).status);
    expect(statuses[0]).toBe(400);
    expect(statuses).toContain(429);
    // Even the right code is blocked while limited (no oracle).
    expect((await g.post('/api/v1/guest/join', { code: real })).status).toBe(429);
  });
  it('QA-Q02: public menu stays open, but ordering without a joined session is refused', async () => {
    const anon = new Client(PATIO_HOST);
    expect((await anon.get('/api/v1/public/menu')).status).toBe(200);
    const r = await anon.post('/api/v1/guest/orders', { lines: [line(items[0]!)] });
    expect(r.status).toBe(401);
    expect((await anon.post('/api/v1/guest/calls', { type: 'service' })).status).toBe(401);
  });
  it('guest session cookie is HttpOnly and SameSite', async () => {
    expect(guest.cookies.size).toBeGreaterThan(0);
    const snap = await guest.get('/api/v1/guest/snapshot');
    expect(snap.status).toBe(200);
    expect(snap.json.data.visit.id).toBe(visitId);
  });
  it('guest session is bound to its tenant', async () => {
    const other = new Client('balcao-do-largo.localhost:3000');
    other.cookies = new Map(guest.cookies);
    const r = await other.get('/api/v1/guest/snapshot');
    expect(r.status).toBe(401);
  });
});

describe('orders (QA-O01..O08)', () => {
  it('creates a mixed kitchen+bar order with server prices', async () => {
    const [a, b] = [items.find((i) => i.name === 'Hambúrguer do Pátio')!, items.find((i) => i.name === 'Cola')!];
    const r = await guest.post('/api/v1/guest/orders', { lines: [line(a, 2), line(b, 1)] });
    expect(r.status, JSON.stringify(r.json)).toBe(201);
    const snap = await guest.get('/api/v1/guest/snapshot');
    const order = snap.json.data.orders.at(-1);
    expect(order.lines.map((l: { unitPriceCents: number }) => l.unitPriceCents).sort()).toEqual([a.priceCents, b.priceCents].sort());
    expect(snap.json.data.bill.totalCents).toBe(2 * a.priceCents + b.priceCents);
  });
  it('rejects client-sent price or station fields (strict schema)', async () => {
    const a = items[0]!;
    const r = await guest.post('/api/v1/guest/orders', { lines: [{ ...line(a), unitPriceCents: 1 }] });
    expect(r.status).toBe(400);
    const r2 = await guest.post('/api/v1/guest/orders', { lines: [line(a)], totalCents: 1 });
    expect(r2.status).toBe(400);
  });
  it('detects a stale expected price (PRICE_CHANGED) instead of charging the old one', async () => {
    const a = items[0]!;
    const r = await guest.post('/api/v1/guest/orders', { lines: [{ ...line(a), expectedPriceCents: a.priceCents - 1 }] });
    expect(r.status).toBe(409);
    expect(['PRICE_CHANGED', 'VERSION_CONFLICT']).toContain(r.json.error.code);
  });
  it('rejects items of another tenant', async () => {
    const balcao = await menu('balcao-do-largo.localhost:3000');
    const r = await guest.post('/api/v1/guest/orders', { lines: [line(balcao.items[0]!)] });
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(r.status).toBeLessThan(500);
  });
  it('20 concurrent submissions with the same Idempotency-Key create exactly one order', async () => {
    const before = (await guestB.get('/api/v1/guest/snapshot')).json.data.orders.length;
    const key = randomUUID();
    const body = { lines: [line(items.find((i) => i.name === 'Batata frita')!, 1)] };
    const res = await Promise.all(Array.from({ length: 20 }, () => guestB.post('/api/v1/guest/orders', body, { idem: key })));
    const ok = res.filter((r) => r.status === 201 || r.status === 200);
    expect(ok.length + res.filter((r) => r.status === 409 || r.status === 429).length).toBe(20);
    const ids = new Set(ok.map((r) => r.json.data.order?.id ?? r.json.data.orderId ?? JSON.stringify(r.json.data)));
    expect(ids.size).toBe(1);
    const after = (await guestB.get('/api/v1/guest/snapshot')).json.data.orders.length;
    expect(after - before).toBe(1);
  });
  it('the same key with a different body is an idempotency conflict', async () => {
    const key = randomUUID();
    const a = items[0]!; const b = items[1]!;
    expect((await guestB.post('/api/v1/guest/orders', { lines: [line(a)] }, { idem: key })).status).toBe(201);
    const r = await guestB.post('/api/v1/guest/orders', { lines: [line(b)] }, { idem: key });
    expect(r.status).toBe(409);
    expect(r.json.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });
  it('cross-site POST is refused (CSRF)', async () => {
    const r = await guest.post('/api/v1/guest/orders', { lines: [line(items[0]!)] }, { origin: 'https://evil.example' });
    expect(r.status).toBe(403);
  });
  it('a 4th accepted order within a minute from the same session is rate limited (rejected ones roll back)', async () => {
    // 1 accepted so far on this session; the refused ones above rolled back with their transaction.
    const s1 = await guest.post('/api/v1/guest/orders', { lines: [line(items[0]!)] });
    const s2 = await guest.post('/api/v1/guest/orders', { lines: [line(items[0]!)] });
    expect([s1.status, s2.status]).toEqual([201, 201]);
    const r = await guest.post('/api/v1/guest/orders', { lines: [line(items[0]!)] });
    expect(r.status).toBe(429);
    expect(r.json.error.code).toBe('RATE_LIMITED');
    expect(Number(r.headers['retry-after'])).toBeGreaterThan(0);
  });
  it('mutation without Idempotency-Key is refused', async () => {
    const r = await guest.post('/api/v1/guest/orders', { lines: [line(items[0]!)] }, { idem: false });
    expect(r.status).toBe(400);
  });
  it('unavailable item is refused and nothing partial is created', async () => {
    const target = items.find((i) => i.name === 'Brownie') ?? items.at(-1)!;
    const m = await admin.get(`${staffApi(PATIO)}/menu/items`);
    const adminItem = (m.json.data.items as { id: string; version: number }[]).find((i) => i.id === target.id)!;
    const off = await admin.patch(`${staffApi(PATIO)}/menu/items/${target.id}/availability`, { available: false, version: adminItem.version });
    expect(off.status, JSON.stringify(off.json)).toBe(200);
    try {
      const before = (await guestC.get('/api/v1/guest/snapshot')).json.data.orders.length;
      const other = items.find((i) => i.id !== target.id)!;
      const r = await guestC.post('/api/v1/guest/orders', { lines: [line(other), line(target)] });
      expect(r.status).toBe(409);
      expect(r.json.error.code).toBe('ITEM_UNAVAILABLE');
      expect((await guestC.get('/api/v1/guest/snapshot')).json.data.orders.length).toBe(before);
    } finally {
      const m2 = await admin.get(`${staffApi(PATIO)}/menu/items`);
      const v = (m2.json.data.items as { id: string; version: number }[]).find((i) => i.id === target.id)!.version;
      await admin.patch(`${staffApi(PATIO)}/menu/items/${target.id}/availability`, { available: true, version: v });
    }
  });
});
