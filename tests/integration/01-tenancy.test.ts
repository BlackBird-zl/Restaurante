import { describe, expect, it } from 'vitest';
import { BALCAO_HOST, Client, PATIO_HOST, STAFF_HOST } from '../support/http';

describe('tenant resolution by Host (QA-T01..T06)', () => {
  it('serves each tenant its own site', async () => {
    const p = await new Client(PATIO_HOST).get('/');
    const b = await new Client(BALCAO_HOST).get('/');
    expect(p.status).toBe(200);
    expect(b.status).toBe(200);
    expect(p.text).toContain('A mesa pede tempo.');
    expect(p.text).not.toContain('Balcão do Largo');
    expect(b.text).toContain('Balcão do Largo');
    expect(b.text).not.toContain('A mesa pede tempo.');
  });
  it('is case-insensitive on the host', async () => {
    expect((await new Client(PATIO_HOST.toUpperCase()).get('/carta')).status).toBe(200);
  });
  it('returns 404 for unknown hosts and for the internal rewrite segment', async () => {
    expect((await new Client('desconhecido.localhost:3000').get('/')).status).toBe(404);
    expect((await new Client(PATIO_HOST).get('/internal-sites/balcao-do-largo')).status).toBe(404);
    expect((await new Client(STAFF_HOST).get('/internal-sites/patio-do-ferro')).status).toBe(404);
  });
  it('ignores spoofed tenant context headers', async () => {
    const r = await new Client(PATIO_HOST).get('/', { 'x-ros-tenant-id': '00000000-0000-0000-0000-000000000000', 'x-ros-tenant-slug': 'balcao-do-largo', 'x-ros-base-path': '/evil' });
    expect(r.status).toBe(200);
    expect(r.text).toContain('A mesa pede tempo.');
    expect(r.text).not.toContain('/evil/carta');
  });
  it('keeps staff routes off tenant hosts', async () => {
    expect((await new Client(PATIO_HOST).get('/entrar')).status).toBe(404);
    expect((await new Client(PATIO_HOST).get('/r/patio-do-ferro')).status).toBe(404);
    expect((await new Client(PATIO_HOST).get('/api/v1/staff/r/patio-do-ferro/snapshot?workspace=me')).status).toBe(404);
  });
  it('preview path works only on preview hosts', async () => {
    expect((await new Client(STAFF_HOST).get('/d/balcao-do-largo')).status).toBe(200);
    expect((await new Client(PATIO_HOST).get('/d/balcao-do-largo')).status).toBe(404);
  });
  it('public menu API is tenant scoped and exposes no internal fields', async () => {
    const p = await new Client(PATIO_HOST).get('/api/v1/public/menu');
    const b = await new Client(BALCAO_HOST).get('/api/v1/public/menu');
    const pIds = new Set(p.json.data.items.map((i: { id: string }) => i.id));
    expect(b.json.data.items.some((i: { id: string }) => pIds.has(i.id))).toBe(false);
    expect(p.text).not.toMatch(/station|cost|restaurant_id|stationId/i);
  });
  it('sets security headers and CSP with nonce', async () => {
    const r = await new Client(PATIO_HOST).get('/');
    expect(r.headers['content-security-policy']).toMatch(/script-src[^;]*'nonce-/);
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['referrer-policy']).toBeTruthy();
  });
});
