import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { MenuDTO } from '@/modules/menu/types';
import type { SiteDTO } from './types';
import { getLocalMenu, getLocalSite, getLocalTable } from '@/data/local-template';

/** Template mode: all public content comes from local fixtures. No Supabase project is required. */
export const getSite = cache(async (restaurantId: string): Promise<SiteDTO> => {
  const site = getLocalSite(restaurantId);
  if (!site) return notFound();
  return site;
});

export const getMenu = cache(async (restaurantId: string): Promise<MenuDTO> => {
  const menu = getLocalMenu(restaurantId);
  if (!menu) return notFound();
  return menu;
});

export const getPublicTable = cache(async (restaurantId: string, label: string) => getLocalTable(restaurantId, label));
