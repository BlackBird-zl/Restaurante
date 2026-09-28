/**
 * Host resolution and routing (Arquitetura §2). Not an authorization layer:
 * every Route Handler and RPC authorizes on its own.
 *
 * - Verified tenant host  → rewrite to /internal-sites/{slug}/… with trusted x-ros-* headers.
 * - Central staff host    → staff/auth/admin routes (+ Supabase session refresh).
 * - Preview hosts         → /d/{slug}/… (never in production).
 * - Unknown host          → neutral 404 (never falls back to a default restaurant).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { CTX, INTERNAL_SEGMENT, isStaffPath, isTenantApi, normalizeHost } from '@/modules/tenancy/host';

type Tenant = { restaurantId: string; slug: string; name: string; isDemo: boolean; isPrimary?: boolean; primaryHost: string | null };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
const APP_ENV = process.env.APP_ENV ?? 'local';
const STAFF_HOST = (process.env.APP_STAFF_HOST ?? '').toLowerCase();
const PREVIEW_HOSTS = APP_ENV === 'production' ? [] : (process.env.APP_PREVIEW_HOSTS ?? '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
const SCHEME = process.env.APP_URL_SCHEME ?? 'https';
const PUBLIC_PORT = process.env.APP_PUBLIC_PORT ?? '';

// Small TTL cache (correctness never depends on it; entries expire quickly).
const cache = new Map<string, { at: number; value: Tenant | null }>();
const TTL_OK = 30_000;
const TTL_MISS = 5_000;

async function rpcResolve(fn: 'site_resolve_host' | 'site_resolve_slug', arg: Record<string, string>): Promise<Tenant | null> {
  const key = `${fn}:${Object.values(arg)[0]}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < (hit.value ? TTL_OK : TTL_MISS)) return hit.value;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(arg),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`tenant resolution failed (${res.status})`);
  const value = (await res.json()) as Tenant | null;
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  return value;
}

function notFound() {
  return new NextResponse('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}

function cleanHeaders(req: NextRequest): Headers {
  const h = new Headers(req.headers);
  for (const k of [...h.keys()]) if (k.startsWith('x-ros-') || k === 'x-nonce' || k === 'x-tenant-id') h.delete(k);
  return h;
}

function csp(nonce: string) {
  const isDev = process.env.NODE_ENV === 'development';
  const supa = SUPABASE_URL ? new URL(SUPABASE_URL) : null;
  const connect = supa ? `${supa.origin} ${supa.protocol === 'https:' ? 'wss' : 'ws'}://${supa.host}` : '';
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data:${supa ? ` ${supa.origin}` : ''}`,
    `font-src 'self'`,
    `connect-src 'self' ${connect}`.trim(),
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(SCHEME === 'https' ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

function withCsp(res: NextResponse, policy: string) {
  res.headers.set('Content-Security-Policy', policy);
  return res;
}

function tenantOrigin(host: string) {
  return `${SCHEME}://${host}`;
}

function routeTenant(req: NextRequest, headers: Headers, t: Tenant, basePath: string, rest: string, host: string, policy: string) {
  headers.set(CTX.tenantId, t.restaurantId);
  headers.set(CTX.tenantSlug, t.slug);
  headers.set(CTX.tenantName, encodeURIComponent(t.name));
  headers.set(CTX.basePath, basePath);
  headers.set(CTX.host, host);
  headers.set(CTX.origin, tenantOrigin(host));
  headers.set(CTX.isDemo, t.isDemo ? '1' : '0');
  headers.set(CTX.preview, basePath ? '1' : '0');
  const primaryHost = t.primaryHost ? `${t.primaryHost}${PUBLIC_PORT ? `:${PUBLIC_PORT}` : ''}` : host;
  headers.set(CTX.primaryOrigin, tenantOrigin(primaryHost));

  const url = req.nextUrl.clone();
  if (isTenantApi(rest)) {
    url.pathname = rest;
    return NextResponse.rewrite(url, { request: { headers } });
  }
  if (isStaffPath(rest) || rest.startsWith('/api/')) return notFound();
  // QR bootstrap: GET /mesa/{label}?q=TOKEN → route handler that sets the context cookie and 303s.
  const mesa = /^\/mesa\/([A-Za-z0-9]{1,8})\/?$/.exec(rest);
  if (mesa && req.nextUrl.searchParams.has('q') && req.method === 'GET') {
    url.pathname = '/api/v1/guest/qr';
    headers.set('x-ros-qr-label', mesa[1]!.toLowerCase());
    return NextResponse.rewrite(url, { request: { headers } });
  }
  url.pathname = `${INTERNAL_SEGMENT}/${t.slug}${rest === '/' ? '' : rest}`;
  return withCsp(NextResponse.rewrite(url, { request: { headers } }), policy);
}

async function staffResponse(req: NextRequest, headers: Headers, host: string, policy: string) {
  headers.set(CTX.host, host);
  headers.set('x-ros-path', req.nextUrl.pathname + req.nextUrl.search);
  let response = NextResponse.next({ request: { headers } });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) req.cookies.set(name, value);
        const refreshed = cleanHeaders(req);
        refreshed.set(CTX.host, host);
        refreshed.set('x-ros-path', req.nextUrl.pathname + req.nextUrl.search);
        refreshed.set(CTX.nonce, headers.get(CTX.nonce) ?? '');
        refreshed.set('content-security-policy', headers.get('content-security-policy') ?? '');
        response = NextResponse.next({ request: { headers: refreshed } });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  // Refreshes the session cookie when needed; authorization still happens per route/RPC.
  await supabase.auth.getClaims();
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return withCsp(response, policy);
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path === INTERNAL_SEGMENT || path.startsWith(`${INTERNAL_SEGMENT}/`)) return notFound();
  const nh = normalizeHost(req.headers.get('host'));
  if (!nh) return notFound();
  const headers = cleanHeaders(req);
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  headers.set(CTX.nonce, nonce);
  const policy = csp(nonce);
  // Next.js reads the nonce from the request CSP header and applies it to its own scripts.
  headers.set('content-security-policy', policy);

  try {
    const isStaffHost = nh.host === STAFF_HOST;
    const isPreviewHost = PREVIEW_HOSTS.includes(nh.host);
    if (isStaffHost || isPreviewHost) {
      const d = /^\/d\/([a-z0-9-]{1,48})(\/.*)?$/.exec(path);
      if (d) {
        if (!isPreviewHost) return notFound();
        const t = await rpcResolve('site_resolve_slug', { p_slug: d[1]! });
        if (!t) return notFound();
        return routeTenant(req, headers, t, `/d/${t.slug}`, d[2] ?? '/', nh.host, policy);
      }
      if (!isStaffHost || isTenantApi(path)) return notFound();
      if (path === '/') return NextResponse.redirect(new URL('/restaurantes', req.url), 307);
      return staffResponse(req, headers, nh.host, policy);
    }

    const t = await rpcResolve('site_resolve_host', { p_hostname: nh.hostname });
    if (!t) return notFound();
    if (t.isPrimary === false && t.primaryHost) {
      const target = new URL(req.nextUrl.toString());
      target.hostname = t.primaryHost;
      return NextResponse.redirect(target, 308);
    }
    return routeTenant(req, headers, t, '', path, nh.host, policy);
  } catch (e) {
    console.error('[proxy] resolution error', e instanceof Error ? e.message : 'unknown');
    return new NextResponse('Serviço temporariamente indisponível', { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' } });
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|demo-assets/|fonts/).*)'],
};
