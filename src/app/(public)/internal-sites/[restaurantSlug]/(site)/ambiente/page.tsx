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
  return pageMetadata(ctx, site, { title: 'Ambiente', path: '/ambiente', description: site.pages.ambience?.intro });
}

export default async function AmbiencePage({ params }: Props) {
  const ctx = await getPublicContext((await params).restaurantSlug);
  const site = await getSite(ctx.restaurantId);
  const page = site.pages.ambience;
  const images = (page?.images ?? []).map((i) => ({ ...i, media: site.media[i.mediaId] })).filter((i) => i.media);
  return (
    <div className={s.container}>
      <header className={s.pageHead}>
        <p className={s.eyebrow}>Ambiente</p>
        <h1 className={`${s.display} ${s.pageTitle}`}>{page?.title ?? 'O espaço'}</h1>
        {page?.intro ? <p className={s.lead}>{page.intro}</p> : null}
      </header>
      {images.length ? (
        <ul className={s.gallery} aria-label="Galeria do espaço">
          {images.map((i) => (
            <li key={i.mediaId}>
              <figure>
                <div className={i.media!.width > i.media!.height ? s.frameWide : s.frame}>
                  <MediaImage media={i.media} use="detail" sizes="(min-width: 900px) 60vw, 100vw" />
                </div>
                {i.caption ? <figcaption>{i.caption}</figcaption> : null}
              </figure>
            </li>
          ))}
        </ul>
      ) : <p style={{ padding: '24px 0 96px' }} className={s.muted}>Ainda não há fotografias publicadas do espaço.</p>}
      <div style={{ paddingBottom: 96 }}>
        <Link className={s.ctaPrimary} href={publicUrl(ctx.basePath, '/reservas')}>Pedir reserva</Link>
      </div>
    </div>
  );
}
