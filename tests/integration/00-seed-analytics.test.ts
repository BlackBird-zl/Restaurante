import { beforeAll, describe, expect, it } from 'vitest';
import { Client, staffApi, staffLogin } from '../support/http';
import { floor, PATIO } from '../support/flow';

/** Plano §4.4 — analytics derived from the DB must equal the seeded scenario exactly (fresh reset). */
let admin: Client;
type A = {
  orders: { submitted: number; fullyCancelled: number; lines: number; unitsOrdered: number };
  received: { totalCents: number; count: number; byMethod: Record<string, number> | { method: string; totalCents: number }[] };
  calls: { total: number; claimWait: { n: number; avgSeconds: number } };
  preparation: { stationCode: string; n: number; avgPrepSeconds: number }[];
  now: { activeVisits: number; freeTables: number; requestedBills: number; openConsumptionCents: number; activeCalls: { total: number; new: number; claimed: number };
    lateLines: { lines: number; tables: string[] } };
};
let a: A;
beforeAll(async () => {
  admin = await staffLogin('marta@patio.example');
  const r = await admin.get(`${staffApi(PATIO)}/analytics`);
  expect(r.status).toBe(200);
  a = r.json.data as A;
});

describe('seed assertions via the analytics API', () => {
  it('orders, lines and units', () => {
    expect(a.orders.submitted).toBe(6);
    expect(a.orders.lines).toBe(13);
    expect(a.orders.unitsOrdered).toBe(18);
  });
  it('external payments received: 56,00 € (36,00 card + 20,00 cash)', () => {
    expect(a.received.totalCents).toBe(5600);
    const bm = Array.isArray(a.received.byMethod)
      ? Object.fromEntries(a.received.byMethod.map((x) => [x.method, x.totalCents]))
      : a.received.byMethod;
    expect(JSON.stringify(bm)).toContain('3600');
    expect(JSON.stringify(bm)).toContain('2000');
  });
  it('current state: 4 active, 10 free, 1 bill requested, 128,00 € open', () => {
    expect(a.now.activeVisits).toBe(4);
    expect(a.now.freeTables).toBe(10);
    expect(a.now.requestedBills).toBe(1);
    expect(a.now.openConsumptionCents).toBe(12800);
  });
  it('calls: 3 (2 new, 1 claimed); claim wait 60 s over 1 call', () => {
    expect(a.calls.total).toBe(3);
    expect(a.now.activeCalls).toMatchObject({ total: 3, new: 2, claimed: 1 });
    expect(a.calls.claimWait).toMatchObject({ n: 1, avgSeconds: 60 });
  });
  it('preparation: COZ 756 s (n=5), BAR 90 s (n=6)', () => {
    const coz = a.preparation.find((p) => p.stationCode === 'COZ')!;
    const bar = a.preparation.find((p) => p.stationCode === 'BAR')!;
    expect([coz.n, Math.round(coz.avgPrepSeconds)]).toEqual([5, 756]);
    expect([bar.n, Math.round(bar.avgPrepSeconds)]).toEqual([6, 90]);
  });
  it('2 late lines, all at Mesa 08', () => {
    expect(a.now.lateLines.lines).toBe(2);
    expect(a.now.lateLines.tables).toEqual(['08']);
  });
  it('floor snapshot agrees with analytics', async () => {
    const f = await floor(admin);
    expect(f.tables.filter((t) => t.state !== 'free')).toHaveLength(4);
    expect(f.tables.filter((t) => t.state === 'free')).toHaveLength(10);
  });
});
