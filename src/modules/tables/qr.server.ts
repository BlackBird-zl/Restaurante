import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { rpc } from '@/lib/supabase/rpc';
import { publicSiteOrigin } from '@/modules/tenancy/public-origin.server';

/** https://{primary-domain}/mesa/{label}?q={token} — the token identifies the table, it does not authorize ordering. */
export async function tableQrUrl(client: SupabaseClient, slug: string, publicSlug: string, token: string) {
  const me = await rpc<{ restaurant: { primaryHost: string | null; slug: string } }>(client, 'staff_get_me', { p_restaurant_slug: slug });
  return `${publicSiteOrigin(slug, me.restaurant.primaryHost)}/mesa/${encodeURIComponent(publicSlug)}?q=${encodeURIComponent(token)}`;
}
