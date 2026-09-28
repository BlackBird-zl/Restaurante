import type { Metadata } from 'next';
import Link from 'next/link';
import { HoursList } from '@/components/public/RestaurantShell';
import s from '@/components/public/public.module.css';
import { pageMetadata } from '@/modules/site/metadata';
import { getSite } from '@/modules/site/queries.server';
import { getPublicContext } from '@/modules/tenancy/context.server';
import { publicUrl } from '@/modules/tenancy/public-url';

type Props = { params: Promise<{ restaurantSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ctx = await getPublicContext((await params).restaurantSlug);
  const site = await getSite(ctx.restaurantId);
  return pageMetadata(ctx, site, { title: 'Contactos', path: '/contactos', description: 'Horário e contactos.' });
}

export default async function ContactPage({ params }: Props) {
  const ctx = await getPublicContext((await params).restaurantSlug);
  const site = await getSite(ctx.restaurantId);
  const c = site.settings.publicContacts;
  const page = site.pages.contact;
  const hasContacts = Boolean(c.phone || c.email || c.addressLine || c.mapUrl);
  return (
    <div className={s.container}>
      <header className={s.pageHead}>
        <p className={s.eyebrow}>Contactos</p>
        <h1 className={`${s.display} ${s.pageTitle}`}>{page?.title ?? 'Contactos e horários'}</h1>
        {page?.intro ? <p className={s.lead}>{page.intro}</p> : null}
      </header>
      <div className={s.visitGrid} style={{ paddingBottom: 110 }}>
        <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          <h2 className={s.h3}>Onde estamos</h2>
          <p>{[c.addressLine, c.city].filter(Boolean).join(', ') || '—'}</p>
          {/* Only verified, configured contacts become actionable links. */}
          {c.phone ? <p><a className={s.textLink} href={`tel:${c.phone.replace(/\s/g, '')}`}>Telefonar {c.phone}</a></p> : null}
          {c.email ? <p><a className={s.textLink} href={`mailto:${c.email}`}>{c.email}</a></p> : null}
          {c.mapUrl ? <p><a className={s.textLink} href={c.mapUrl} rel="noopener noreferrer" target="_blank">Abrir mapa</a></p> : null}
          {!hasContacts ? <p className={s.conceptNote}>Este restaurante não publicou telefone, email ou morada. Use o pedido de reserva.</p> : null}
          <div><Link className={s.ctaPrimary} href={publicUrl(ctx.basePath, '/reservas')}>Pedir reserva</Link></div>
        </div>
        <div>
          <h2 className={s.h3} style={{ marginBottom: 16 }}>Horário</h2>
          <HoursList site={site} />
          <p className={s.muted} style={{ marginTop: 12, fontSize: '0.9rem' }}>Horário ilustrativo. O serviço de pedidos à mesa é aberto e fechado pela equipa.</p>
        </div>
      </div>
    </div>
  );
}
