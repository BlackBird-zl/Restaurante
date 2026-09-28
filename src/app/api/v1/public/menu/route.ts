import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { filterMenu } from '@/modules/menu/types';
import { readTenantHeaders } from '@/modules/tenancy/context.server';
import { getLocalMenu } from '@/data/local-template';

export async function GET(req: NextRequest) {
  const ctx = await readTenantHeaders(req);
  if (!ctx) return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  const menu = getLocalMenu(ctx.restaurantId);
  if (!menu) return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  const q = (req.nextUrl.searchParams.get('q') ?? '').slice(0, 80);
  const category = req.nextUrl.searchParams.get('categoria');
  let items = filterMenu(menu.items, q);
  if (category) items = items.filter((i) => i.categorySlug === category);
  return NextResponse.json({ data: { categories: menu.categories, items }, meta: { mode: 'template-local' } });
}
