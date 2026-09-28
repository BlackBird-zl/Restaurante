import 'server-only';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { CTX } from './host';

export type PublicTenantContext = {
  kind: 'public';
  restaurantId: string;
  slug: string;
  name: string;
  basePath: string; // '' on the tenant host, '/d/{slug}' in preview
  host: string;
  origin: string;
  primaryOrigin: string;
  isDemo: boolean;
  isPreview: boolean;
  nonce: string;
};

/**
 * Reads the context produced by the proxy (browser-sent x-ros-* headers are stripped there)
 * and re-checks that the rendered slug is the resolved tenant. Mismatch → 404.
 */
export const getPublicContext = cache(async (slugParam?: string): Promise<PublicTenantContext> => {
  const h = await headers();
  const restaurantId = h.get(CTX.tenantId);
  const slug = h.get(CTX.tenantSlug);
  if (!restaurantId || !slug || (slugParam && slugParam !== slug)) notFound();
  return {
    kind: 'public',
    restaurantId,
    slug,
    name: decodeURIComponent(h.get(CTX.tenantName) ?? slug),
    basePath: h.get(CTX.basePath) ?? '',
    host: h.get(CTX.host) ?? '',
    origin: h.get(CTX.origin) ?? '',
    primaryOrigin: h.get(CTX.primaryOrigin) ?? '',
    isDemo: h.get(CTX.isDemo) === '1',
    isPreview: h.get(CTX.preview) === '1',
    nonce: h.get(CTX.nonce) ?? '',
  };
});

/** Same as above for Route Handlers (returns null instead of throwing notFound). */
export async function readTenantHeaders(req: Request): Promise<PublicTenantContext | null> {
  const h = req.headers;
  const restaurantId = h.get(CTX.tenantId);
  const slug = h.get(CTX.tenantSlug);
  if (!restaurantId || !slug) return null;
  return {
    kind: 'public', restaurantId, slug, name: decodeURIComponent(h.get(CTX.tenantName) ?? slug),
    basePath: h.get(CTX.basePath) ?? '', host: h.get(CTX.host) ?? '', origin: h.get(CTX.origin) ?? '',
    primaryOrigin: h.get(CTX.primaryOrigin) ?? '', isDemo: h.get(CTX.isDemo) === '1', isPreview: h.get(CTX.preview) === '1',
    nonce: '',
  };
}
