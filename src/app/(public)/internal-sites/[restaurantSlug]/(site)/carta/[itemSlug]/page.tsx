import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ItemDetail } from '@/components/public/ItemDetail';
import s from '@/components/public/public.module.css';
import { TableContextLink } from '@/components/table/TableContextLink';
import { pageMetadata } from '@/modules/site/metadata';
import { getMenu, getSite } from '@/modules/site/queries.server';
import { getPublicContext } from '@/modules/tenancy/context.server';
import { publicUrl } from '@/modules/tenancy/public-url';

type Props = { params: Promise<{ restaurantSlug: string; itemSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const ctx = await getPublicContext(p.restaurantSlug);
  const [site, menu] = await Promise.all([getSite(ctx.restaurantId), getMenu(ctx.restaurantId)]);
  const item = menu.items.find((i) => i.slug === p.itemSlug);
  if (!item) return pageMetadata(ctx, site, { title: 'Produto não encontrado', path: `/carta/${p.itemSlug}` });
  return pageMetadata(ctx, site, { title: item.name, path: `/carta/${item.slug}`, description: item.description, image: item.cover });
}

export default async function ItemPage({ params }: Props) {
  const p = await params;
  const ctx = await getPublicContext(p.restaurantSlug);
  const [site, menu] = await Promise.all([getSite(ctx.restaurantId), getMenu(ctx.restaurantId)]);
  const item = menu.items.find((i) => i.slug === p.itemSlug);
  if (!item) notFound();
  const category = menu.categories.find((c) => c.id === item.categoryId);
  return (
    <div className={s.container}>
      <ItemDetail
        item={item}
        category={category}
        isDemo={site.restaurant.isDemo}
        crumbs={[
          { href: publicUrl(ctx.basePath, '/carta'), label: 'Carta' },
          ...(category ? [{ href: publicUrl(ctx.basePath, `/carta/categoria/${category.slug}`), label: category.name }] : []),
        ]}
        actions={
          <>
            <TableContextLink basePath={ctx.basePath} itemSlug={item.slug} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              <Link className={s.ctaPrimary} href={publicUrl(ctx.basePath, '/reservas')}>Planear visita</Link>
              <Link className={s.textLink} href={publicUrl(ctx.basePath, '/carta')}>Voltar à carta</Link>
            </div>
          </>
        }
      />
    </div>
  );
}
