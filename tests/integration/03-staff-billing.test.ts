import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { patio } from '@fixtures/patio-do-ferro/data';
import { localToday, reservationSlots, type WeeklyHours } from '@/lib/time';
import { BALCAO_HOST, Client, PATIO_HOST, staffApi, staffLogin } from '../support/http';
import { deliverAll, floor, freeTable, line, menu, openAndJoin, PATIO } from '../support/flow';

let admin: Client; let rui: Client; let ines: Client; let tomas: Client; let leonor: Client; let joana: Client;
beforeAll(async () => {
  [admin, rui, ines, tomas, leonor, joana] = (await Promise.all(['marta@patio.example', 'rui@patio.example', 'ines@patio.example',
    'tomas@patio.example', 'leonor@patio.example', 'joana@balcao.example'].map((e) => staffLogin(e)))) as [Client, Client, Client, Client, Client, Client];
});

describe('RBAC and cross-tenant isolation over HTTP (QA-A01..A08)', () => {
  it('rejects anonymous staff API calls', async () => {
    expect((await new Client('localhost:3000').get(`${staffApi(PATIO)}/snapshot?workspace=me`)).status).toBe(401);
  });
  it('kitchen cannot read the floor, the cashier or admin data', async () => {
    expect((await ines.get(`${staffApi(PATIO)}/snapshot?workspace=floor`)).status).toBe(403);
    expect((await ines.get(`${staffApi(PATIO)}/snapshot?workspace=cashier`)).status).toBe(403);
    expect((await ines.get(`${staffApi(PATIO)}/members`)).status).toBe(403);
    expect((await ines.get(`${staffApi(PATIO)}/analytics`)).status).toBe(403);
  });
  it('kitchen sees only its own station', async () => {
    expect((await ines.get(`${staffApi(PATIO)}/snapshot?workspace=station&station=COZ`)).status).toBe(200);
    expect((await ines.get(`${staffApi(PATIO)}/snapshot?workspace=station&station=BAR`)).status).toBe(403);
  });
  it('a member of another restaurant gets nothing from Pátio (and vice versa)', async () => {
    for (const path of ['/snapshot?workspace=me', '/snapshot?workspace=floor', '/menu/items', '/tables', '/orders']) {
      const r = await joana.get(`${staffApi(PATIO)}${path}`);
      expect([403, 404], path).toContain(r.status);
    }
    const r = await admin.get(`${staffApi('balcao-do-largo')}/snapshot?workspace=me`);
    expect([403, 404]).toContain(r.status);
  });
  it('an admin cannot act on another tenant\'s object id through its own slug', async () => {
    const bt = await joana.get(`${staffApi('balcao-do-largo')}/tables`);
    const foreignTable = bt.json.data.tables[0].id as string;
    const r = await admin.post(`${staffApi(PATIO)}/tables/${foreignTable}/visits`, {});
    expect([403, 404]).toContain(r.status);
  });
});

describe('bill lifecycle with external payment (QA-B01..B08)', () => {
  let guest: Client; let visitId: string; let tableId: string;
  beforeAll(async () => {
    const t = await freeTable(rui);
    tableId = t.id;
    ({ guest, visitId } = await openAndJoin(rui, admin, t.id));
    const items = (await menu()).items;
    const burger = items.find((i) => i.name === 'Hambúrguer do Pátio')!;
    const cola = items.find((i) => i.name === 'Cola')!;
    expect((await guest.post('/api/v1/guest/orders', { lines: [line(burger, 1), line(cola, 2)] })).status).toBe(201);
  });

  it('bar cannot move kitchen lines (station scope)', async () => {
    const v = await admin.get(`${staffApi(PATIO)}/visits/${visitId}`);
    const kitchenLine = (v.json.data.lines as { id: string; version: number; stationCode: string }[]).find((l) => l.stationCode === 'COZ')!;
    const r = await tomas.post(`${staffApi(PATIO)}/items/transition`, { items: [{ id: kitchenLine.id, version: kitchenLine.version }], targetState: 'preparing' });
    expect(r.status).toBe(403);
  });
  it('guest bill request is not a payment and blocks new guest orders', async () => {
    const r = await guest.post('/api/v1/guest/bill-request', {});
    expect(r.status, JSON.stringify(r.json)).toBe(200);
    const snap = await guest.get('/api/v1/guest/snapshot');
    expect(snap.json.data.bill.status).toBe('requested');
    const items = (await menu()).items;
    const o = await guest.post('/api/v1/guest/orders', { lines: [line(items[0]!)] });
    expect(o.status).toBe(409);
    const cashier = await leonor.get(`${staffApi(PATIO)}/snapshot?workspace=cashier`);
    expect(cashier.status).toBe(200);
  });
  it('cannot settle while lines are pending', async () => {
    const f = await floor(rui);
    const v = f.tables.find((t) => t.id === tableId)!.visit!;
    const r = await leonor.post(`${staffApi(PATIO)}/bills/${v.billId}/settle`, { version: v.billVersion, expectedTotalCents: 0, method: 'cash' });
    expect(r.status).toBe(409);
    expect(['PENDING_ITEMS', 'VERSION_CONFLICT']).toContain(r.json.error.code);
  });
  it('settle checks the total seen by the cashier', async () => {
    await deliverAll(admin, visitId);
    const f = await floor(rui);
    const v = f.tables.find((t) => t.id === tableId)!.visit!;
    const bill = await leonor.get(`${staffApi(PATIO)}/bills/${v.billId}`);
    const total = bill.json.data.bill.totalCents as number;
    const r = await leonor.post(`${staffApi(PATIO)}/bills/${v.billId}/settle`, { version: v.billVersion, expectedTotalCents: total + 100, method: 'cash' });
    expect(r.status).toBe(409);
    expect(r.json.error.code).toBe('VERSION_CONFLICT');
  });
  it('two concurrent settlements: exactly one payment, session revoked, table freed', async () => {
    const f = await floor(rui);
    const v = f.tables.find((t) => t.id === tableId)!.visit!;
    const bill = await leonor.get(`${staffApi(PATIO)}/bills/${v.billId}`);
    const { totalCents, version } = bill.json.data.bill as { totalCents: number; version: number };
    const [a, b] = await Promise.all([
      leonor.post(`${staffApi(PATIO)}/bills/${v.billId}/settle`, { version, expectedTotalCents: totalCents, method: 'external_card' }),
      admin.post(`${staffApi(PATIO)}/bills/${v.billId}/settle`, { version, expectedTotalCents: totalCents, method: 'cash' }),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 409]);
    const after = await leonor.get(`${staffApi(PATIO)}/bills/${v.billId}`);
    expect(after.json.data.bill.status).toBe('settled');
    expect(after.json.data.payments ?? [after.json.data.payment]).toHaveLength(1);
    const snap = await guest.get('/api/v1/guest/snapshot');
    expect([401, 410]).toContain(snap.status);
    const f2 = await floor(rui);
    expect(f2.tables.find((t) => t.id === tableId)!.state).toBe('free');
  });
  it('a settled bill cannot be settled or voided again (terminal)', async () => {
    const v = await admin.get(`${staffApi(PATIO)}/visits/${visitId}`);
    const bill = v.json.data.bill as { id: string; version: number; totalCents: number };
    const again = await leonor.post(`${staffApi(PATIO)}/bills/${bill.id}/settle`, { version: bill.version, expectedTotalCents: bill.totalCents, method: 'cash' });
    expect(again.status).toBe(409);
    expect(again.json.error.code).toBe('BILL_CLOSED');
    const voided = await admin.post(`${staffApi(PATIO)}/bills/${bill.id}/void`, { version: bill.version, reason: 'teste' });
    expect(voided.status).toBe(409);
  });
});

describe('reservations are requests, confirmed by a human (QA-R01..R05)', () => {
  const hours = patio.weeklyHours as unknown as WeeklyHours;
  function nextSlot() {
    const d = new Date(`${localToday()}T12:00:00Z`);
    for (let i = 2; i < 14; i++) {
      const day = new Date(d.getTime() + i * 86_400_000).toISOString().slice(0, 10);
      const slots = reservationSlots(hours, day);
      if (slots.length) return { date: day, time: slots[0]! };
    }
    throw new Error('no slot');
  }
  const base = () => ({ name: 'Cliente Teste', email: 'cliente@example.test', partySize: 2, elapsedMs: 5000, ...nextSlot() });
  it('rejects honeypot and too-fast submissions explicitly', async () => {
    const c = new Client(PATIO_HOST);
    expect((await c.post('/api/v1/public/reservations', { ...base(), website: 'http://spam' })).status).toBe(400);
    expect((await c.post('/api/v1/public/reservations', { ...base(), elapsedMs: 300 })).status).toBe(400);
  });
  it('rejects times outside published hours', async () => {
    const r = await new Client(PATIO_HOST).post('/api/v1/public/reservations', { ...base(), time: '04:00' });
    expect(r.status).toBe(400);
  });
  it('creates a pending request; confirming requires stating contact was made', async () => {
    const r = await new Client(PATIO_HOST).post('/api/v1/public/reservations', base());
    expect(r.status, JSON.stringify(r.json)).toBe(201);
    const list = await admin.get(`${staffApi(PATIO)}/reservations`);
    const resv = (list.json.data.reservations as { id: string; status: string; version: number; email: string }[]).find((x) => x.email === 'cliente@example.test' && x.status === 'pending')!;
    expect(resv).toBeTruthy();
    const no = await admin.post(`${staffApi(PATIO)}/reservations/${resv.id}/transition`, { target: 'confirmed', version: resv.version, contactConfirmed: false });
    expect([400, 409]).toContain(no.status);
    const yes = await admin.post(`${staffApi(PATIO)}/reservations/${resv.id}/transition`, { target: 'confirmed', version: resv.version, contactConfirmed: true });
    expect(yes.status, JSON.stringify(yes.json)).toBe(200);
  });
  it('the other tenant never sees Pátio reservations', async () => {
    const r = await joana.get(`${staffApi('balcao-do-largo')}/reservations`);
    expect(r.status).toBe(200);
    expect(JSON.stringify(r.json)).not.toContain('cliente@example.test');
    void BALCAO_HOST; void randomUUID;
  });
});
