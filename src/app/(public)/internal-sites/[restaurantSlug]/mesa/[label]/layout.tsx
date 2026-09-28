import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import { TableRoot } from '@/components/table/TableRoot';
import { getPublicContext } from '@/modules/tenancy/context.server';
import { getMenu, getSite } from '@/modules/site/queries.server';
import { getTableState } from '@/modules/tables/state.server';
import { onAccent, themeVars } from '@/modules/themes/theme';

// Table pages are private and never indexed or cached.
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: 'no-referrer' };
export const dynamic = 'force-dynamic';

export default async function TableLayout({ children, params }: { children: ReactNode; params: Promise<{ restaurantSlug: string; label: string }> }) {
  const p = await params;
  const ctx = await getPublicContext(p.restaurantSlug);
  const [site, menu, state] = await Promise.all([getSite(ctx.restaurantId), getMenu(ctx.restaurantId), getTableState(ctx, p.label)]);
  const style = { ...themeVars(site.theme.tokens, site.theme.preset), '--on-accent': onAccent(site.theme.tokens?.color?.accent ?? '#6F3038') } as CSSProperties;
  const drinks = menu.categories.find((c) => menu.items.some((i) => i.categoryId === c.id && (i.containsAlcohol || /copo|bebida|café|cafe/i.test(c.name))));
  const drinksHref = drinks ? `${ctx.basePath}/mesa/${state.label.toLowerCase()}/carta#${drinks.slug}` : null;
  return (
    <TableRoot tenantId={ctx.restaurantId} basePath={ctx.basePath} label={state.label} restaurantName={site.restaurant.name}
      mode={state.mode} initialSnapshot={state.mode === 'session' ? state.snapshot : null} style={style} preset={site.theme.preset}
      drinksHref={drinksHref}>
      {children}
    </TableRoot>
  );
}
