import type { Metadata } from 'next';
import s from '@/components/public/public.module.css';
import { pageMetadata } from '@/modules/site/metadata';
import { getSite } from '@/modules/site/queries.server';
import { getPublicContext } from '@/modules/tenancy/context.server';

type Props = { params: Promise<{ restaurantSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ctx = await getPublicContext((await params).restaurantSlug);
  const site = await getSite(ctx.restaurantId);
  return pageMetadata(ctx, site, { title: 'Privacidade', path: '/privacidade' });
}

export default async function PrivacyPage({ params }: Props) {
  const ctx = await getPublicContext((await params).restaurantSlug);
  const site = await getSite(ctx.restaurantId);
  const page = site.pages.privacy;
  return (
    <div className={s.container} style={{ paddingBottom: 110 }}>
      <header className={s.pageHead}>
        <p className={s.eyebrow}>Informação</p>
        <h1 className={`${s.display} ${s.pageTitle}`}>{page?.title ?? 'Privacidade'}</h1>
      </header>
      <div className={s.prose}>
        {(page?.sections ?? []).map((sec) => (
          <section key={sec.title} style={{ display: 'grid', gap: 8 }}>
            <h2 className={s.h3}>{sec.title}</h2>
            <p>{sec.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
