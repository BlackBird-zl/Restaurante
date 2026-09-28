import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { publicClient } from '@/lib/supabase/server';
import { rpc } from '@/lib/supabase/rpc';
import type { MenuDTO } from '@/modules/menu/types';
import type { SiteDTO } from './types';

/** Published site of a tenant (per-request memoized; SSR no-store). */
export const getSite = cache(async (restaurantId: string): Promise<SiteDTO> => {
  const site = await rpc<SiteDTO | null>(publicClient(), 'site_get_site', { p_restaurant_id: restaurantId });
  if (!site) notFound();
  return site;
});

/** Published menu — the single source of prices for site, table and staff. */
export const getMenu = cache(async (restaurantId: string): Promise<MenuDTO> => {
  const menu = await rpc<MenuDTO | null>(publicClient(), 'site_get_menu', { p_restaurant_id: restaurantId });
  if (!menu) notFound();
  return menu;
});

export const getPublicTable = cache(async (restaurantId: string, label: string) =>
  rpc<{ label: string; publicSlug: string } | null>(publicClient(), 'site_get_table', { p_restaurant_id: restaurantId, p_public_slug: label }));
