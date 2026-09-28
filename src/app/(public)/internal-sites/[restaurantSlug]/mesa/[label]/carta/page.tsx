import { MenuList } from '@/components/public/MenuList';
import { QuickAdd } from '@/components/table/TableViews';
import s from '@/components/table/table.module.css';
import { getPublicContext } from '@/modules/tenancy/context.server';
import { getMenu } from '@/modules/site/queries.server';
import { getTableState } from '@/modules/tables/state.server';

type Props = { params: Promise<{ restaurantSlug: string; label: string }> };

/** Same menu DTO and MenuList as the public site; only the action changes. */
export default async function TableMenu({ params }: Props) {
  const p = await params;
  const ctx = await getPublicContext(p.restaurantSlug);
  const [menu, state] = await Promise.all([getMenu(ctx.restaurantId), getTableState(ctx, p.label)]);
  const base = `${ctx.basePath}/mesa/${state.label.toLowerCase()}`;
  return (
    <div>
      <h1 className={s.helloTitle} style={{ margin: '8px 0 12px' }}>Carta</h1>
      {state.mode !== 'session' ? <p className={s.muted} style={{ marginBottom: 12 }}>Leia o QR da mesa e introduza o código para pedir.</p> : null}
      <nav className={s.catChips} aria-label="Categorias">
        {menu.categories.map((c) => <a key={c.id} href={`#${c.slug}`}>{c.name}</a>)}
      </nav>
      <MenuList categories={menu.categories} items={menu.items} headingLevel={2}
        hrefFor={(i) => `${base}/carta/${i.slug}`}
        actionFor={state.mode === 'session' ? (i) => <QuickAdd item={i} /> : undefined} />
    </div>
  );
}
