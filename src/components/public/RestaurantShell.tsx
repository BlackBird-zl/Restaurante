import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import type { PublicTenantContext } from '@/modules/tenancy/context.server';
import { publicUrl } from '@/modules/tenancy/public-url';
import type { SiteDTO } from '@/modules/site/types';
import { onAccent, themeVars } from '@/modules/themes/theme';
import { summarizeHours } from '@/lib/time';
import { Wordmark } from './Wordmark';
import { NavLinks } from './NavLinks';
import s from './public.module.css';

const NAV = [
  { href: '/carta', label: 'Carta' },
  { href: '/sobre', label: 'Sobre' },
  { href: '/ambiente', label: 'Ambiente' },
  { href: '/contactos', label: 'Contactos' },
];

/** Brand shell of the public site: tokens, header, footer. The platform stays invisible. */
export function RestaurantShell({ ctx, site, children }: {
  ctx: PublicTenantContext; site: SiteDTO; children: ReactNode;
}) {
  const url = (p: string) => publicUrl(ctx.basePath, p);
  const tokens = site.theme.tokens;
  const style = { ...themeVars(tokens, site.theme.preset), '--on-accent': onAccent(tokens?.color?.accent ?? '#6F3038') } as CSSProperties;
  const hours = summarizeHours(site.settings.weeklyHours);
  const note = site.pages.home?.footer?.note;
  return (
    <div className={s.shell} data-preset={site.theme.preset} style={style}>
      <a className="skip-link" href="#conteudo">Saltar para o conteúdo</a>
      <header className={s.header}>
        <div className={`${s.container} ${s.headerInner}`}>
          <Link href={url('/')} aria-label={`${site.restaurant.name} — início`} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>
            <Wordmark name={site.restaurant.name} />
          </Link>
          <nav className={s.nav} aria-label="Principal">
            <NavLinks basePath={ctx.basePath} items={NAV} />
            <Link className={s.reserveLink} href={url('/reservas')}>Pedir reserva</Link>
          </nav>
          <details className={s.mobileMenu}>
            <summary aria-label="Abrir menu">Menu</summary>
            <nav className={s.mobilePanel} aria-label="Principal (móvel)">
              {NAV.map((n) => <Link key={n.href} href={url(n.href)}>{n.label}</Link>)}
              <Link href={url('/reservas')}>Pedir reserva</Link>
            </nav>
          </details>
        </div>
      </header>
      <main id="conteudo" className={s.main}>{children}</main>
      <footer className={s.footer}>
        <div className={s.container}>
          <div className={s.footerGrid}>
            <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
              <Wordmark name={site.restaurant.name} />
              <p className={s.muted} style={{ maxWidth: '34ch' }}>{site.settings.publicContacts.city ?? ''}</p>
            </div>
            <nav className={s.footerNav} aria-label="Rodapé">
              <Link href={url('/carta')}>Carta</Link>
              <Link href={url('/sobre')}>Sobre</Link>
              <Link href={url('/ambiente')}>Ambiente</Link>
              <Link href={url('/reservas')}>Reservas</Link>
              <Link href={url('/contactos')}>Contactos</Link>
              <Link href={url('/privacidade')}>Privacidade</Link>
            </nav>
            <div>
              <p className={s.eyebrow} style={{ marginBottom: 10 }}>Horário</p>
              <dl style={{ display: 'grid', gap: 6, margin: 0 }}>
                {hours.map((h) => (
                  <div key={h.days} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <dt>{h.days}</dt><dd className="tabular" style={{ margin: 0, textAlign: 'right' }}>{h.windows}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <div className={s.footerNote}>
            <span>{note ?? `© ${site.restaurant.name}`}</span>
            <span>Pedidos à mesa pelo código QR · Sem conta necessária</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function HoursList({ site }: { site: SiteDTO }) {
  const hours = summarizeHours(site.settings.weeklyHours);
  return (
    <dl className={s.hours}>
      {hours.map((h) => (
        <div className={s.hoursRow} key={h.days}>
          <dt className={s.hoursDays}>{h.days}</dt>
          <dd className={s.hoursWin} style={{ margin: 0 }}>{h.windows}</dd>
        </div>
      ))}
    </dl>
  );
}
