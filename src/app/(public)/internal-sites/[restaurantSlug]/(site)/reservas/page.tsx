import type { Metadata } from 'next';
import { ReservationForm } from '@/components/public/ReservationForm';
import { HoursList } from '@/components/public/RestaurantShell';
import s from '@/components/public/public.module.css';
import { pageMetadata } from '@/modules/site/metadata';
import { getSite } from '@/modules/site/queries.server';
import { getPublicContext } from '@/modules/tenancy/context.server';

type Props = { params: Promise<{ restaurantSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ctx = await getPublicContext((await params).restaurantSlug);
  const site = await getSite(ctx.restaurantId);
  return pageMetadata(ctx, site, { title: 'Reservas', path: '/reservas', description: site.pages.reservations?.body });
}

export default async function ReservationsPage({ params }: Props) {
  const ctx = await getPublicContext((await params).restaurantSlug);
  const site = await getSite(ctx.restaurantId);
  const page = site.pages.reservations;
  return (
    <div className={s.container}>
      <header className={s.pageHead}>
        <p className={s.eyebrow}>Reservas</p>
        <h1 className={`${s.display} ${s.pageTitle}`}>{page?.title ?? 'Reservas'}</h1>
        {page?.body ? <p className={s.lead}>{page.body}</p> : null}
      </header>
      <div className={s.split}>
        <div>
          <noscript><p className={s.demoNotice}>Ative o JavaScript para enviar o pedido de reserva.</p></noscript>
          <ReservationForm basePath={ctx.basePath} weeklyHours={site.settings.weeklyHours}
            demoNotice={site.restaurant.isDemo ? (page?.demoNotice ?? 'Simulação: use dados fictícios.') : undefined} />
        </div>
        <aside style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <h2 className={s.h3}>Horário</h2>
          <HoursList site={site} />
          <p className={s.muted} style={{ fontSize: '0.92rem' }}>Os horários do formulário são indicativos dentro do horário publicado; não representam lugares disponíveis.</p>
        </aside>
      </div>
    </div>
  );
}
