import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatEUR } from '@/lib/money';
import { allergenText, type CategoryDTO, type MenuItemDTO } from '@/modules/menu/types';
import { MediaImage } from './MediaImage';
import s from './public.module.css';

/**
 * One menu renderer for the public site and the table context (same DTO, same prices).
 * `hrefFor` decides where a row leads; `actionFor` (table mode) adds a quick-add control.
 */
export function MenuList({ categories, items, hrefFor, actionFor, showCategoryHeads = true, headingLevel = 2 }: {
  categories: CategoryDTO[]; items: MenuItemDTO[]; hrefFor: (i: MenuItemDTO) => string;
  actionFor?: (i: MenuItemDTO) => ReactNode; showCategoryHeads?: boolean; headingLevel?: 2 | 3;
}) {
  const H = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <>
      {categories.map((c) => {
        const list = items.filter((i) => i.categoryId === c.id);
        if (!list.length) return null;
        return (
          <section key={c.id} id={c.slug} className={s.menuSection} aria-labelledby={`cat-${c.slug}`}>
            {showCategoryHeads ? (
              <div className={s.menuSectionHead}>
                <H id={`cat-${c.slug}`} className={s.h3}>{c.name}</H>
                {c.description ? <p className={s.muted}>{c.description}</p> : null}
              </div>
            ) : <H id={`cat-${c.slug}`} className="sr-only">{c.name}</H>}
            <ul className={s.menuList}>
              {list.map((i) => <MenuItemRow key={i.id} item={i} href={hrefFor(i)} action={actionFor?.(i)} />)}
            </ul>
          </section>
        );
      })}
    </>
  );
}

export function MenuItemRow({ item, href, action }: { item: MenuItemDTO; href: string; action?: ReactNode }) {
  return (
    <li className={`${s.menuRow} ${item.isAvailable ? '' : s.menuRowUnavailable}`}>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 12 }}>
        <Link href={href} className={`${s.menuRowLink} ${item.cover ? '' : s.menuRowNoImg}`} style={{ flex: 1, minWidth: 0 }}>
          {item.cover ? (
            <span className={s.menuThumb}><MediaImage media={item.cover} use="thumb" sizes="96px" ratio="1 / 1" alt="" /></span>
          ) : null}
          <span style={{ minWidth: 0 }}>
            <span className={s.menuName}>{item.name}</span>
            <span className={s.menuDesc} style={{ display: 'block' }}>{item.description}</span>
            <span className={s.menuTags}>
              {!item.isAvailable ? <span className={s.soldOut}>Esgotado</span> : null}
              {item.isVegetarian ? <span>Vegetariano</span> : null}
              <span>Alergénios: {allergenText(item.allergens)}</span>
            </span>
          </span>
          <span className={`${s.price} ${s.menuPrice}`}>{formatEUR(item.priceCents)}</span>
        </Link>
        {action ? <div style={{ display: 'flex', alignItems: 'center' }}>{action}</div> : null}
      </div>
    </li>
  );
}
