import type { Metadata } from 'next';
import Link from 'next/link';
import { MenuList } from '@/components/public/MenuList';
import s from '@/components/public/public.module.css';
import { filterMenu } from '@/modules/menu/types';
import { pageMetadata } from '@/modules/site/metadata';
import { getMenu, getSite } from '@/modules/site/queries.server';
import { getPublicContext } from '@/modules/tenancy/context.server';
import { publicUrl } from '@/modules/tenancy/public-url';
import { TableContextLink } from '@/components/table/TableContextLink';

type Props = { params: Promise<{ restaurantSlug: string }>; searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ctx = await getPublicContext((await params).restaurantSlug);
  const site = await getSite(ctx.restaurantId);
  return pageMetadata(ctx, site, { title: 'Carta', path: '/carta', description: `Carta do ${site.restaurant.name}: pratos, preços e alergénios declarados.` });
}

export default async function MenuPage({ params, searchParams }: Props) {
  const ctx = await getPublicContext((await params).restaurantSlug);
  const [site, menu] = await Promise.all([getSite(ctx.restaurantId), getMenu(ctx.restaurantId)]);
  const q = ((await searchParams).q ?? '').slice(0, 80);
  const items = filterMenu(menu.items, q);
  return (
    <>
      <div className={s.container}>
        <header className={s.pageHead}>
          <p className={s.eyebrow}>{site.restaurant.name}</p>
          <h1 className={`${s.display} ${s.pageTitle}`}>Carta</h1>
          <p className={s.lead}>Preços finais em euros, com IVA incluído. A lista de alergénios é informativa: fale com a equipa antes de pedir.</p>
          <TableContextLink basePath={ctx.basePath} />
        </header>
      </div>
      <div className={s.menuTools}>
        <div className={`${s.container} ${s.menuToolsInner}`}>
          <nav className={s.catNav} aria-label="Categorias">
            {menu.categories.map((c) => <Link key={c.id} href={publicUrl(ctx.basePath, `/carta/categoria/${c.slug}`)}>{c.name}</Link>)}
          </nav>
          <form className={s.search} role="search" action={publicUrl(ctx.basePath, '/carta')}>
            <label htmlFor="q" className="sr-only">Pesquisar na carta</label>
            <input id="q" name="q" type="search" maxLength={80} defaultValue={q} placeholder="Pesquisar prato ou bebida" />
            <button type="submit">Pesquisar</button>
          </form>
        </div>
      </div>
      <div className={s.container} style={{ paddingBottom: 96 }}>
        {q ? (
          <p aria-live="polite" style={{ paddingTop: 28 }}>
            {items.length ? `${items.length} resultado${items.length > 1 ? 's' : ''} para “${q}”.` : `Sem resultados para “${q}”.`}{' '}
            <Link href={publicUrl(ctx.basePath, '/carta')} className={s.textLink}>Ver a carta completa</Link>
          </p>
        ) : null}
        {menu.items.length === 0 ? <p style={{ padding: '48px 0' }}>A carta ainda não foi publicada.</p> : null}
        <MenuList categories={menu.categories} items={items} hrefFor={(i) => publicUrl(ctx.basePath, `/carta/${i.slug}`)} />
      </div>
    </>
  );
}
