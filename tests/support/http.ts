/**
 * Minimal HTTP client for integration tests: talks to the running app on 127.0.0.1 with an explicit
 * Host header (tenant hosts like patio-do-ferro.localhost) and a per-client cookie jar.
 */
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const APP_PORT = Number(process.env.QA_APP_PORT ?? 3000);
export const STAFF_HOST = `localhost:${APP_PORT}`;
export const PATIO_HOST = `patio-do-ferro.localhost:${APP_PORT}`;
export const BALCAO_HOST = `balcao-do-largo.localhost:${APP_PORT}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test assertions navigate arbitrary JSON
export type Res = { status: number; headers: http.IncomingHttpHeaders; text: string; json: any; body: Buffer };

export class Client {
  cookies = new Map<string, string>();
  constructor(public host: string) {}

  cookieHeader() { return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '); }

  request(method: string, path: string, opts: { json?: unknown; form?: Record<string, string>; headers?: Record<string, string>; idem?: string | boolean; origin?: string | null } = {}): Promise<Res> {
    const headers: Record<string, string> = { host: this.host, ...(opts.headers ?? {}) };
    let payload: Buffer | undefined;
    if (opts.json !== undefined) { payload = Buffer.from(JSON.stringify(opts.json)); headers['content-type'] = 'application/json'; }
    if (opts.form) { payload = Buffer.from(new URLSearchParams(opts.form).toString()); headers['content-type'] = 'application/x-www-form-urlencoded'; }
    if (payload) headers['content-length'] = String(payload.length);
    if (method !== 'GET') {
      if (opts.origin !== null) headers.origin = opts.origin ?? `http://${this.host}`;
      if (opts.idem !== false) headers['idempotency-key'] = typeof opts.idem === 'string' ? opts.idem : randomUUID();
    }
    const c = this.cookieHeader();
    if (c) headers.cookie = c;
    return new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port: APP_PORT, method, path, headers }, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (d: Buffer) => chunks.push(d));
        res.on('end', () => {
          for (const sc of res.headers['set-cookie'] ?? []) {
            const [pair] = sc.split(';');
            const i = pair!.indexOf('=');
            const k = pair!.slice(0, i).trim(); const v = pair!.slice(i + 1).trim();
            if (!v || /max-age=0|expires=thu, 01 jan 1970/i.test(sc)) this.cookies.delete(k); else this.cookies.set(k, v);
          }
          const body = Buffer.concat(chunks);
          const text = body.toString('utf8');
          let json: unknown = null;
          try { json = JSON.parse(text); } catch { /* not json */ }
          resolve({ status: res.statusCode ?? 0, headers: res.headers, text, json, body });
        });
      });
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }
  get(path: string, headers?: Record<string, string>) { return this.request('GET', path, { headers }); }
  post(path: string, json?: unknown, opts: { idem?: string | boolean; origin?: string | null; headers?: Record<string, string> } = {}) { return this.request('POST', path, { json: json ?? {}, ...opts }); }
  patch(path: string, json?: unknown) { return this.request('PATCH', path, { json: json ?? {} }); }
}

export function demoPassword(email: string): string {
  const creds = JSON.parse(readFileSync('.demo-credentials.local.json', 'utf8')) as { users: { email: string; password: string }[] };
  const u = creds.users.find((x) => x.email === email);
  if (!u) throw new Error(`no demo credentials for ${email} — run pnpm seed:demo`);
  return u.password;
}

export async function staffLogin(email: string, host = STAFF_HOST): Promise<Client> {
  const c = new Client(host);
  const r = await c.request('POST', '/auth/login', { form: { email, password: demoPassword(email), next: '/restaurantes' }, idem: false });
  if (r.status !== 303 || String(r.headers.location).includes('erro')) throw new Error(`login failed for ${email}: ${r.status} ${r.headers.location}`);
  return c;
}

export const staffApi = (slug: string) => `/api/v1/staff/r/${slug}`;
