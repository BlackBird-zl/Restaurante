import { readTenantHeaders } from '@/modules/tenancy/context.server';
import { rpc } from '@/lib/supabase/rpc';
import { publicClient } from '@/lib/supabase/server';

export async function GET(req: Request, { params }: { params: Promise<{ restaurantSlug: string }> }) {
  const ctx = await readTenantHeaders(req);
  const { restaurantSlug } = await params;
  if (!ctx || ctx.slug !== restaurantSlug) return new Response('Not found', { status: 404 });
  const site = await rpc<{ restaurant: { isDemo: boolean } } | null>(publicClient(), 'site_get_site', { p_restaurant_id: ctx.restaurantId });
  const noindex = !site || site.restaurant.isDemo || ctx.isPreview;
  const body = noindex
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\nDisallow: /mesa/\nDisallow: /api/\nSitemap: ${ctx.primaryOrigin}/sitemap.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
