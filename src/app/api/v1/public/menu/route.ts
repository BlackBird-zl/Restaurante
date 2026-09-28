import type { NextRequest } from 'next/server';
import { ApiError, handleError, ok } from '@/lib/http/server';
import { publicClient } from '@/lib/supabase/server';
import { rpc } from '@/lib/supabase/rpc';
import { filterMenu, type MenuDTO } from '@/modules/menu/types';
import { readTenantHeaders } from '@/modules/tenancy/context.server';

export async function GET(req: NextRequest) {
  try {
    const ctx = await readTenantHeaders(req);
    if (!ctx) throw new ApiError('NOT_FOUND');
    const menu = await rpc<MenuDTO>(publicClient(), 'site_get_menu', { p_restaurant_id: ctx.restaurantId });
    const q = (req.nextUrl.searchParams.get('q') ?? '').slice(0, 80);
    const category = req.nextUrl.searchParams.get('categoria');
    let items = filterMenu(menu.items, q);
    if (category) items = items.filter((i) => i.categorySlug === category);
    return ok({ categories: menu.categories, items });
  } catch (e) {
    return handleError(e);
  }
}
