import { execSync } from 'node:child_process';
import { beforeAll, describe, expect, it } from 'vitest';
import { Client, PATIO_HOST, STAFF_HOST, staffApi, staffLogin } from '../support/http';
import { tableQrUrl } from '../support/qr';
import { freeTable, line, menu, openAndJoin, PATIO } from '../support/flow';

let admin: Client; let rui: Client;
beforeAll(async () => {
  admin = await staffLogin('marta@patio.example');
  rui = await staffLogin('rui@patio.example');
});

describe('authentication (QA-A01)', () => {
  it('wrong password → neutral error; logout ends the session', async () => {
    const c = new Client(STAFF_HOST);
    const bad = await c.request('POST', '/auth/login', { form: { email: 'rui@patio.example', password: 'nope-nope-123', next: '/restaurantes' }, idem: false });
    expect(bad.status).toBe(303);
    expect(String(bad.headers.location)).toMatch(/erro=credenciais/);
    const ghost = await c.request('POST', '/auth/login', { form: { email: 'ninguem@example.test', password: 'nope-nope-123', next: '/restaurantes' }, idem: false });
    expect(String(ghost.headers.location)).toBe(String(bad.headers.location)); // no account enumeration
    const s = await staffLogin('sara@patio.example');
    expect((await s.get(`${staffApi(PATIO)}/snapshot?workspace=me`)).status).toBe(200);
    await s.request('POST', '/auth/logout', { form: {}, idem: false });
    expect((await s.get(`${staffApi(PATIO)}/snapshot?workspace=me`)).status).toBe(401);
  });
  it('password recovery email is actually delivered to the local collector (Mailpit)', async () => {
    const before = await (await fetch('http://127.0.0.1:54324/api/v1/messages')).json() as { total: number };
    const r = await new Client(STAFF_HOST).request('POST', '/auth/recover', { form: { email: 'sara@patio.example' }, idem: false });
    expect(r.status).toBe(303);
    let msgs: { messages: { To: { Address: string }[]; Subject: string }[]; total: number } = { messages: [], total: before.total };
    for (let i = 0; i < 20 && msgs.total <= before.total; i++) {
      await new Promise((res) => setTimeout(res, 500));
      msgs = await (await fetch('http://127.0.0.1:54324/api/v1/messages')).json();
    }
    expect(msgs.total).toBeGreaterThan(before.total);
    expect(msgs.messages[0]!.To[0]!.Address).toBe('sara@patio.example');
    // Same neutral answer for an unknown email.
    const u = await new Client(STAFF_HOST).request('POST', '/auth/recover', { form: { email: 'ninguem@example.test' }, idem: false });
    expect(u.headers.location).toBe(r.headers.location);
  });
});

describe('team invitation (QA-M07)', () => {
  it('admin invites a floor member; Supabase Auth delivers the invitation to the local collector', async () => {
    const email = `novo.${Date.now()}@patio.example`;
    const r = await admin.post(`${staffApi(PATIO)}/members`, { email, displayName: 'Novo Empregado', roles: ['floor'] });
    expect(r.status, JSON.stringify(r.json)).toBe(201);
    expect(r.json.data.delivery).toBe('invited');
    let found: { To: { Address: string }[] } | undefined;
    for (let i = 0; i < 20 && !found; i++) {
      await new Promise((res) => setTimeout(res, 500));
      const m = await (await fetch('http://127.0.0.1:54324/api/v1/messages')).json() as { messages: { ID: string; To: { Address: string }[] }[] };
      found = m.messages.find((x) => x.To[0]?.Address === email);
    }
    expect(found).toBeTruthy();
    const rui2 = await staffLogin('rui@patio.example');
    const denied = await rui2.post(`${staffApi(PATIO)}/members`, { email: `x.${Date.now()}@patio.example`, displayName: 'X', roles: ['admin'] });
    expect(denied.status).toBe(403);
  });
});

describe('QR rotation (QA-Q07)', () => {
  it('reprint keeps the URL; rotation revokes the old QR and its sessions', async () => {
    const t = await freeTable(rui);
    const first = await tableQrUrl(admin, PATIO, t.id);
    expect((await tableQrUrl(admin, PATIO, t.id)).href).toBe(first.href);
    const { guest } = await openAndJoin(rui, admin, t.id);
    expect((await guest.get('/api/v1/guest/snapshot')).status).toBe(200);
    const tables = await admin.get(`${staffApi(PATIO)}/tables`);
    const row = (tables.json.data.tables as { id: string; version: number }[]).find((x) => x.id === t.id)!;
    const noConfirm = await admin.post(`${staffApi(PATIO)}/tables/${t.id}/qr`, { version: row.version, confirmImpact: false });
    expect(noConfirm.status).toBe(409);
    const rot = await admin.post(`${staffApi(PATIO)}/tables/${t.id}/qr`, { version: row.version, confirmImpact: true, revokeSessions: true });
    expect(rot.status, JSON.stringify(rot.json)).toBe(200);
    const next = await tableQrUrl(admin, PATIO, t.id);
    expect(next.href).not.toBe(first.href);
    const old = await new Client(PATIO_HOST).get(`${first.pathname}${first.search}`);
    expect(String(old.headers.location)).toMatch(/estado=qr-(revogado|invalido)/);
    expect([401, 410]).toContain((await guest.get('/api/v1/guest/snapshot')).status);
    expect(first.search).not.toBe('');
  });
});

describe('site draft → publish (QA-M05)', () => {
  it('saving a draft does not change the public site; publishing does', async () => {
    const s = await admin.get(`${staffApi(PATIO)}/site`);
    expect(s.status).toBe(200);
    const page = s.json.data.pages.about as { draft: Record<string, unknown>; version: number };
    const marker = `Rascunho QA ${Date.now()}`;
    const save = await admin.patch(`${staffApi(PATIO)}/site/about`, { version: page.version, draft: { ...page.draft, title: marker } });
    expect(save.status, JSON.stringify(save.json)).toBe(200);
    expect((await new Client(PATIO_HOST).get('/sobre')).text).not.toContain(marker);
    const pub = await admin.post(`${staffApi(PATIO)}/site/about/publish`, { version: save.json.data.version });
    expect(pub.status, JSON.stringify(pub.json)).toBe(200);
    expect((await new Client(PATIO_HOST).get('/sobre')).text).toContain(marker);
    const html = await admin.patch(`${staffApi(PATIO)}/site/about`, { version: pub.json.data.version ?? save.json.data.version + 1, draft: { ...page.draft, title: '<script>x</script>' } });
    expect(html.status).toBeGreaterThanOrEqual(400);
  });
});

describe('price change keeps history (QA-M01/O08)', () => {
  it('new price applies to new orders only', async () => {
    const t = await freeTable(rui);
    const { guest } = await openAndJoin(rui, admin, t.id);
    const items = (await menu()).items;
    const burger = items.find((i) => i.name === 'Hambúrguer do Pátio')!;
    expect((await guest.post('/api/v1/guest/orders', { lines: [line(burger)] })).status).toBe(201);
    const m = await admin.get(`${staffApi(PATIO)}/menu/items`);
    const adminItem = (m.json.data.items as { id: string; version: number; priceCents: number }[]).find((i) => i.id === burger.id)!;
    const upd = await admin.patch(`${staffApi(PATIO)}/menu/items/${burger.id}`, { version: adminItem.version, patch: { priceCents: 1600 } });
    expect(upd.status, JSON.stringify(upd.json)).toBe(200);
    try {
      const pub = (await menu()).items.find((i) => i.id === burger.id)!;
      expect(pub.priceCents).toBe(1600);
      const stale = await guest.post('/api/v1/guest/orders', { lines: [line(burger)] });
      expect(stale.status).toBe(409); // old expected price → reconfirm
      const snap = await guest.get('/api/v1/guest/snapshot');
      expect(snap.json.data.orders[0].lines[0].unitPriceCents).toBe(burger.priceCents);
    } finally {
      const m2 = await admin.get(`${staffApi(PATIO)}/menu/items`);
      const v = (m2.json.data.items as { id: string; version: number }[]).find((i) => i.id === burger.id)!.version;
      await admin.patch(`${staffApi(PATIO)}/menu/items/${burger.id}`, { version: v, patch: { priceCents: burger.priceCents } });
    }
  });
});

describe('demo reset guards (QA-D02/D03)', () => {
  it('refuses without confirmation, in production and for non-demo tenants', () => {
    const run = (cmd: string, env: Record<string, string> = {}) => {
      try { execSync(cmd, { stdio: 'pipe', env: { ...process.env, ...env } }); return 0; } catch (e) { return (e as { status: number }).status; }
    };
    expect(run('pnpm -s reset:demo')).not.toBe(0);
    expect(run('pnpm -s reset:demo --confirm=reset-demo', { APP_ENV: 'production' })).not.toBe(0);
    expect(run('pnpm -s reset:demo --confirm=reset-demo --slug=tasca-teste')).not.toBe(0);
  });
});
