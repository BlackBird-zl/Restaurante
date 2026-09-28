import type { ReactNode } from 'react';
import { RestaurantShell } from '@/components/public/RestaurantShell';
import { getPublicContext } from '@/modules/tenancy/context.server';
import { getSite } from '@/modules/site/queries.server';

export default async function SiteLayout({ children, params }: { children: ReactNode; params: Promise<{ restaurantSlug: string }> }) {
  const { restaurantSlug } = await params;
  const ctx = await getPublicContext(restaurantSlug);
  const site = await getSite(ctx.restaurantId);
  return <RestaurantShell ctx={ctx} site={site}>{children}</RestaurantShell>;
}
