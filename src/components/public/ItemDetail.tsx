import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatEUR } from '@/lib/money';
import { ALLERGEN_LABELS, type CategoryDTO, type MenuItemDTO } from '@/modules/menu/types';
import { MediaImage } from './MediaImage';
import s from './public.module.css';

export const ALLERGY_NOTICE = 'Para alergias ou adaptações, fale com a equipa antes de pedir. As observações não confirmam a adaptação.';

/** Same product sheet in the public site and in the table context; only shell/actions change. */
export function ItemDetail({ item, category, crumbs, actions, isDemo }: {
  item: MenuItemDTO; category: CategoryDTO | undefined; crumbs: { href: string; label: string }[]; actions?: ReactNode; isDemo?: boolean;
}) {
  return (
    <article className={s.item}>
      <nav aria-label="Caminho" style={{ padding: '20px 0 24px' }}>
        <ol className={s.crumbs}>
          {crumbs.map((c) => <li key={c.href}><Link href={c.href}>{c.label}</Link></li>)}
          <li aria-current="page">{item.name}</li>
        </ol>
      </nav>
      <div className={s.itemGrid}>
        <div className={s.itemMedia}>
          {item.cover ? <MediaImage media={item.cover} use="detail" priority sizes="(min-width: 900px) 55vw, 100vw" /> : null}
        </div>
        <div className={s.itemInfo}>
          {category ? <p className={s.eyebrow}>{category.name}</p> : null}
          <h1 className={`${s.display} ${s.itemTitle}`}>{item.name}</h1>
          <p className={s.lead}>{item.description}</p>
          <p className={`${s.price} ${s.itemPrice}`}>{formatEUR(item.priceCents)}</p>
          {!item.isAvailable ? <p><span className={s.soldOut}>Esgotado de momento</span></p> : null}
          {actions ? <div className={s.itemActions}>{actions}</div> : null}
          <dl className={s.facts}>
            {item.ingredients ? (
              <div className={s.fact}><dt className={s.factLabel}>Ingredientes</dt><dd style={{ margin: 0 }}>{item.ingredients}</dd></div>
            ) : null}
            <div className={s.fact}>
              <dt className={s.factLabel}>Alergénios</dt>
              <dd style={{ margin: 0 }}>
                {item.allergens.length ? item.allergens.map((a) => ALLERGEN_LABELS[a] ?? a).join(', ') : 'Nenhum declarado'}
                {isDemo ? <span className={s.muted} style={{ display: 'block', fontSize: '0.85rem' }}>Lista declarada no restaurante de demonstração; não é uma garantia alimentar.</span> : null}
              </dd>
            </div>
            {item.isVegetarian ? <div className={s.fact}><dt className={s.factLabel}>Dieta</dt><dd style={{ margin: 0 }}>Vegetariano</dd></div> : null}
            {item.containsAlcohol ? <div className={s.fact}><dt className={s.factLabel}>Álcool</dt><dd style={{ margin: 0 }}>Contém álcool. Venda a maiores de 18 anos.</dd></div> : null}
          </dl>
          <p className={s.allergyNote}>{ALLERGY_NOTICE}</p>
        </div>
      </div>
    </article>
  );
}
