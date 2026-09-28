/**
 * QA-U08 (reduced, local): 10 free Pátio tables × 5 devices = 50 guest sessions, 50 concurrent orders
 * (one per device) while 20 staff pollers read snapshots every ~1 s. Verifies no duplicates/losses and
 * reports latency percentiles. Distinct X-Forwarded-For values simulate distinct phones (the local server
 * trusts that header; behind Vercel it is set by the platform).
 * Usage: pnpm reset:demo --confirm=reset-demo && pnpm tsx scripts/qa/load.ts
 */
import { Client, PATIO_HOST, staffApi, staffLogin } from '../../tests/support/http';
import { tableQrUrl } from '../../tests/support/qr';

const SLUG = 'patio-do-ferro';
const pct = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] ?? 0; };

async function main() {
  const admin = await staffLogin('marta@patio.example');
  const rui = await staffLogin('rui@patio.example');
  const floor = (await rui.get(`${staffApi(SLUG)}/snapshot?workspace=floor`)).json.data as { tables: { id: string; label: string; state: string }[] };
  const free = floor.tables.filter((t) => t.state === 'free').slice(0, 10);
  if (free.length < 10) throw new Error('need 10 free tables — run pnpm reset:demo first');
  const menu = (await new Client(PATIO_HOST).get('/api/v1/public/menu')).json.data.items as { id: string; name: string; priceCents: number; version: number; isAvailable: boolean }[];
  const available = menu.filter((i) => i.isAvailable);

  const guests: { c: Client; table: string }[] = [];
  let ip = 10;
  for (const t of free) {
    const open = await rui.post(`${staffApi(SLUG)}/tables/${t.id}/visits`, {});
    const code = open.json.data.joinCode as string;
    const qr = await tableQrUrl(admin, SLUG, t.id);
    for (let d = 0; d < 5; d++) {
      const c = new Client(PATIO_HOST);
      const xff = { 'x-forwarded-for': `198.51.100.${ip++}` };
      await c.request('GET', `${qr.pathname}${qr.search}`, { headers: xff });
      const j = await c.request('POST', '/api/v1/guest/join', { json: { code }, headers: xff });
      if (j.status !== 201) throw new Error(`join ${t.label}/${d}: ${j.status} ${j.text}`);
      guests.push({ c, table: t.label });
    }
  }
  console.log(`sessions: ${guests.length} on ${free.length} tables`);

  // 20 staff pollers (reusing 5 logins × 4 workspaces) for the duration of the burst.
  const staffClients = await Promise.all(['rui@patio.example', 'sara@patio.example', 'ines@patio.example', 'tomas@patio.example', 'leonor@patio.example'].map((e) => staffLogin(e)));
  const ws = ['floor', 'station&station=COZ', 'station&station=BAR', 'cashier'];
  const pollLat: number[] = []; let pollErr = 0; let polling = true;
  const pollers = Array.from({ length: 20 }, async (_, i) => {
    const c = staffClients[i % 5]!; const w = ws[Math.floor(i / 5)]!;
    while (polling) {
      const t0 = performance.now();
      const r = await c.get(`${staffApi(SLUG)}/snapshot?workspace=${w}`);
      if (r.status === 200) pollLat.push(performance.now() - t0); else if (r.status !== 403) pollErr++;
      await new Promise((res) => setTimeout(res, 800 + Math.random() * 400));
    }
  });

  const orderLat: number[] = []; const statuses = new Map<number, number>();
  await Promise.all(guests.map(async ({ c }, i) => {
    const item = available[i % available.length]!;
    const t0 = performance.now();
    const r = await c.post('/api/v1/guest/orders', { lines: [{ itemId: item.id, quantity: 1, expectedItemVersion: item.version, expectedPriceCents: item.priceCents }] });
    orderLat.push(performance.now() - t0);
    statuses.set(r.status, (statuses.get(r.status) ?? 0) + 1);
  }));
  await new Promise((res) => setTimeout(res, 3000));
  polling = false;
  await Promise.all(pollers);

  // Verification against the database view of each table.
  let orders = 0;
  for (const t of free) {
    const f = (await rui.get(`${staffApi(SLUG)}/snapshot?workspace=floor`)).json.data as { tables: { label: string; visit: { id: string } | null }[] };
    const v = f.tables.find((x) => x.label === t.label)!.visit!;
    const d = await admin.get(`${staffApi(SLUG)}/visits/${v.id}`);
    orders += new Set((d.json.data.lines as { orderNumber: number }[]).map((l) => l.orderNumber)).size;
  }
  const out = {
    guests: guests.length, orderStatuses: Object.fromEntries(statuses), ordersInDb: orders,
    orderLatencyMs: { p50: Math.round(pct(orderLat, 50)), p95: Math.round(pct(orderLat, 95)), max: Math.round(Math.max(...orderLat)) },
    staffPolls: pollLat.length, staffPollErrors: pollErr,
    staffPollLatencyMs: { p50: Math.round(pct(pollLat, 50)), p95: Math.round(pct(pollLat, 95)) },
  };
  console.log(JSON.stringify(out, null, 2));
  if (orders !== guests.length || (statuses.get(201) ?? 0) !== guests.length) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
