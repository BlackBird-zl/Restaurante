/**
 * Local-template router. The public showcase is intentionally backend-free:
 * - root host renders Pátio do Ferro;
 * - /demo/balcao-do-largo renders the second visual preset;
 * - /d/{slug} remains available as a compatibility preview path.
 * No Supabase URL, API key, database or Auth project is required to render the template.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { CTX, INTERNAL_SEGMENT, isStaffPath, isTenantApi, normalizeHost } from '@/modules/tenancy/host';
import { getLocalTenantBySlug } from '@/data/local-template';

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
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`,
  ].join('; ');
}

function withCsp(res: NextResponse, policy: string) {
  res.headers.set('Content-Security-Policy', policy);
  return res;
}

function routeTenant(req: NextRequest, headers: Headers, slug: string, basePath: string, rest: string, host: string, policy: string) {
  const t = getLocalTenantBySlug(slug);
  if (!t) return notFound();
  const scheme = req.nextUrl.protocol.replace(':', '') || 'https';
  const origin = `${scheme}://${host}`;
  headers.set(CTX.tenantId, t.restaurantId);
  headers.set(CTX.tenantSlug, t.slug);
  headers.set(CTX.tenantName, encodeURIComponent(t.name));
  headers.set(CTX.basePath, basePath);
  headers.set(CTX.host, host);
  headers.set(CTX.origin, origin);
  headers.set(CTX.primaryOrigin, origin);
  headers.set(CTX.isDemo, '1');
  headers.set(CTX.preview, basePath ? '1' : '0');

  const url = req.nextUrl.clone();
  if (isTenantApi(rest)) {
    url.pathname = rest;
    return withCsp(NextResponse.rewrite(url, { request: { headers } }), policy);
  }
  if (isStaffPath(rest) || rest.startsWith('/api/')) return notFound();
  url.pathname = `${INTERNAL_SEGMENT}/${t.slug}${rest === '/' ? '' : rest}`;
  return withCsp(NextResponse.rewrite(url, { request: { headers } }), policy);
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path === INTERNAL_SEGMENT || path.startsWith(`${INTERNAL_SEGMENT}/`)) return notFound();
  const nh = normalizeHost(req.headers.get('host'));
  if (!nh) return notFound();
  const headers = cleanHeaders(req);
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const policy = csp(nonce);
  headers.set(CTX.nonce, nonce);
  headers.set('content-security-policy', policy);

  // Explicit second-demo path.
  const demo = /^\/demo\/([a-z0-9-]{1,48})(\/.*)?$/.exec(path);
  if (demo) return routeTenant(req, headers, demo[1]!, `/demo/${demo[1]}`, demo[2] ?? '/', nh.host, policy);

  // Compatibility with the original preview URLs.
  const preview = /^\/d\/([a-z0-9-]{1,48})(\/.*)?$/.exec(path);
  if (preview) return routeTenant(req, headers, preview[1]!, `/d/${preview[1]}`, preview[2] ?? '/', nh.host, policy);

  // Staff/auth/database operations are not part of the backend-free showcase.
  if (isStaffPath(path)) {
    const target = req.nextUrl.clone();
    target.pathname = '/';
    target.searchParams.set('modo', 'template');
    return NextResponse.redirect(target, 307);
  }

  // A normal Vercel/localhost URL opens the primary demo immediately.
  return routeTenant(req, headers, 'patio-do-ferro', '', path, nh.host, policy);
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|demo-assets/|fonts/).*)'] };
