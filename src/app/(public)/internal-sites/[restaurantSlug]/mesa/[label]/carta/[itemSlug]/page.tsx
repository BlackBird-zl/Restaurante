import { notFound } from 'next/navigation';
import { ItemDetail } from '@/components/public/ItemDetail';
import { AddToCart } from '@/components/table/TableViews';
import { getPublicContext } from '@/modules/tenancy/context.server';
import { getMenu, getSite } from '@/modules/site/queries.server';
import { getTableState } from '@/modules/tables/state.server';

type Props = { params: Promise<{ restaurantSlug: string; label: string; itemSlug: string }> };

/** The same ItemDetail as /carta/{slug}, inside the table shell with quantity/notes. */
export default async function TableItem({ params }: Props) {
  const p = await params;
  const ctx = await getPublicContext(p.restaurantSlug);
  const [site, menu, state] = await Promise.all([getSite(ctx.restaurantId), getMenu(ctx.restaurantId), getTableState(ctx, p.label)]);
  const item = menu.items.find((i) => i.slug === p.itemSlug);
  if (!item) notFound();
  const category = menu.categories.find((c) => c.id === item.categoryId);
  const base = `${ctx.basePath}/mesa/${state.label.toLowerCase()}`;
  return (
    <ItemDetail item={item} category={category} isDemo={site.restaurant.isDemo}
      crumbs={[{ href: `${base}/carta`, label: 'Carta' }, ...(category ? [{ href: `${base}/carta#${category.slug}`, label: category.name }] : [])]}
      actions={<AddToCart item={item} />} />
  );
}
