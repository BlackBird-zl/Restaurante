import type { Metadata } from 'next';
import Link from 'next/link';
import { MediaImage } from '@/components/public/MediaImage';
import s from '@/components/public/public.module.css';
import { pageMetadata } from '@/modules/site/metadata';
import { getSite } from '@/modules/site/queries.server';
import { getPublicContext } from '@/modules/tenancy/context.server';
import { publicUrl } from '@/modules/tenancy/public-url';

type Props = { params: Promise<{ restaurantSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ctx = await getPublicContext((await params).restaurantSlug);
  const site = await getSite(ctx.restaurantId);
  return pageMetadata(ctx, site, { title: 'Sobre', path: '/sobre', description: site.pages.about?.intro });
}

export default async function AboutPage({ params }: Props) {
  const ctx = await getPublicContext((await params).restaurantSlug);
  const site = await getSite(ctx.restaurantId);
  const about = site.pages.about;
  const media = (about?.mediaIds ?? []).map((id) => site.media[id]).filter(Boolean);
  return (
    <div className={s.container}>
      <header className={s.pageHead}>
        <p className={s.eyebrow}>Sobre</p>
        <h1 className={`${s.display} ${s.pageTitle}`}>{about?.title ?? site.restaurant.name}</h1>
      </header>
      <div className={s.split}>
        <div className={s.prose}>
          <p className={s.lead} style={{ color: 'var(--c-text)', fontFamily: 'var(--font-display)', fontSize: '1.5rem', lineHeight: 1.45 }}>{about?.intro}</p>
          {(about?.paragraphs ?? []).map((p, i) => <p key={i}>{p}</p>)}
          {about?.signature ? <p className={s.signature}>{about.signature}</p> : null}
          {about?.conceptNote ? <p className={s.conceptNote}>{about.conceptNote}</p> : null}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 8 }}>
            <Link className={s.textLink} href={publicUrl(ctx.basePath, '/ambiente')}>Conhecer o espaço</Link>
            <Link className={s.textLink} href={publicUrl(ctx.basePath, '/reservas')}>Pedir reserva</Link>
          </div>
        </div>
        {media.length ? (
          <div className={s.splitMedia}>
            {media.map((m) => <div key={m!.id} className={s.frame}><MediaImage media={m} use="card" sizes="(min-width: 900px) 25vw, 50vw" /></div>)}
          </div>
        ) : null}
      </div>
    </div>
  );
}
