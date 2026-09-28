import { readTenantHeaders } from '@/modules/tenancy/context.server';
import { rpc } from '@/lib/supabase/rpc';
import { publicClient } from '@/lib/supabase/server';
import type { MenuDTO } from '@/modules/menu/types';

/** Public, published pages only. Table, auth, operation and admin are never listed. */
export async function GET(req: Request, { params }: { params: Promise<{ restaurantSlug: string }> }) {
  const ctx = await readTenantHeaders(req);
  const { restaurantSlug } = await params;
  if (!ctx || ctx.slug !== restaurantSlug) return new Response('Not found', { status: 404 });
  const menu = await rpc<MenuDTO>(publicClient(), 'site_get_menu', { p_restaurant_id: ctx.restaurantId });
  const paths = ['/', '/carta', '/sobre', '/ambiente', '/reservas', '/contactos', '/privacidade',
    ...menu.categories.map((c) => `/carta/categoria/${c.slug}`), ...menu.items.map((i) => `/carta/${i.slug}`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
    .map((p) => `  <url><loc>${ctx.primaryOrigin}${p === '/' ? '' : p}</loc></url>`).join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
