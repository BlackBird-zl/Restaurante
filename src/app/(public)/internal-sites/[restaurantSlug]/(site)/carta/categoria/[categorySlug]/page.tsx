import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MenuList } from '@/components/public/MenuList';
import s from '@/components/public/public.module.css';
import { pageMetadata } from '@/modules/site/metadata';
import { getMenu, getSite } from '@/modules/site/queries.server';
import { getPublicContext } from '@/modules/tenancy/context.server';
import { publicUrl } from '@/modules/tenancy/public-url';

type Props = { params: Promise<{ restaurantSlug: string; categorySlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const ctx = await getPublicContext(p.restaurantSlug);
  const [site, menu] = await Promise.all([getSite(ctx.restaurantId), getMenu(ctx.restaurantId)]);
  const cat = menu.categories.find((c) => c.slug === p.categorySlug);
  return pageMetadata(ctx, site, { title: cat?.name ?? 'Carta', path: `/carta/categoria/${p.categorySlug}`, description: cat?.description });
}

export default async function CategoryPage({ params }: Props) {
  const p = await params;
  const ctx = await getPublicContext(p.restaurantSlug);
  const menu = await getMenu(ctx.restaurantId);
  const cat = menu.categories.find((c) => c.slug === p.categorySlug);
  if (!cat) notFound();
  const idx = menu.categories.indexOf(cat);
  const next = menu.categories[idx + 1];
  return (
    <div className={s.container} style={{ paddingBottom: 96 }}>
      <header className={s.pageHead}>
        <nav aria-label="Caminho">
          <ol className={s.crumbs}>
            <li><Link href={publicUrl(ctx.basePath, '/carta')}>Carta</Link></li>
            <li aria-current="page">{cat.name}</li>
          </ol>
        </nav>
        <h1 className={`${s.display} ${s.pageTitle}`}>{cat.name}</h1>
        {cat.description ? <p className={s.lead}>{cat.description}</p> : null}
      </header>
      <MenuList categories={[cat]} items={menu.items} showCategoryHeads={false} hrefFor={(i) => publicUrl(ctx.basePath, `/carta/${i.slug}`)} />
      <nav aria-label="Outras categorias" style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 40 }}>
        <Link className={s.textLink} href={publicUrl(ctx.basePath, '/carta')}>Carta completa</Link>
        {next ? <Link className={s.textLink} href={publicUrl(ctx.basePath, `/carta/categoria/${next.slug}`)}>{next.name}</Link> : null}
      </nav>
    </div>
  );
}
