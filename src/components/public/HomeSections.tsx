import Link from 'next/link';
import { formatEUR } from '@/lib/money';
import type { MenuDTO, MenuItemDTO } from '@/modules/menu/types';
import type { HomePage, Preset, SiteDTO } from '@/modules/site/types';
import { CTA_TARGETS, publicUrl } from '@/modules/tenancy/public-url';
import { Icon } from '@/components/ui/Icon';
import { MediaImage } from './MediaImage';
import { HoursList } from './RestaurantShell';
import s from './public.module.css';

type Props = { home: HomePage; site: SiteDTO; menu: MenuDTO; basePath: string };

function itemsByIds(menu: MenuDTO, ids: string[] | undefined): MenuItemDTO[] {
  // Archived/hidden products simply disappear from highlights (admin sees a pending warning).
  return (ids ?? []).map((id) => menu.items.find((i) => i.id === id)).filter((i): i is MenuItemDTO => Boolean(i));
}

function cta(basePath: string, key: string | undefined, fallback: string) {
  return publicUrl(basePath, CTA_TARGETS[key ?? ''] ?? fallback);
}

/* -------------------------------- HERO (three compositions) -------------------------------- */
export function Hero({ home, site, basePath }: Props) {
  const preset: Preset = site.theme.preset;
  const media = home.hero.mediaId ? site.media[home.hero.mediaId] : null;
  const text = (
    <>
      {home.hero.eyebrow ? <p className={s.eyebrow}>{home.hero.eyebrow}</p> : null}
      <h1 className={`${s.display} ${s.heroTitle}`}>{home.hero.title}</h1>
      {home.hero.body ? <p className={s.lead} style={preset === 'noite-grafica' ? { color: '#e9e5dc' } : undefined}>{home.hero.body}</p> : null}
      <div className={s.heroCtas}>
        <Link className={s.ctaPrimary} href={cta(basePath, home.hero.primaryLink, '/carta')}>
          {home.hero.primaryLabel ?? 'Ver a carta'} <Icon name="arrowRight" size={18} />
        </Link>
        {home.hero.secondaryLink ? (
          <Link className={s.textLink} href={cta(basePath, home.hero.secondaryLink, '/reservas')}
            style={preset === 'noite-grafica' ? { color: '#fff' } : undefined}>
            {home.hero.secondaryLabel ?? 'Pedir reserva'}
          </Link>
        ) : null}
      </div>
    </>
  );
  if (preset === 'balcao-claro') {
    return (
      <section className={s.heroSplit} aria-label="Apresentação">
        {media ? (
          <div className={s.heroMedia}><MediaImage media={media} use="hero" priority sizes="(min-width: 900px) 50vw, 100vw" /></div>
        ) : (
          <div className={s.heroSplitBlock} aria-hidden><span>{site.restaurant.name}</span></div>
        )}
        <div className={s.heroSplitPanel}>{text}</div>
      </section>
    );
  }
  if (preset === 'noite-grafica') {
    return (
      <section className={s.heroNight} aria-label="Apresentação">
        {media ? <div className={s.heroNightMedia}><MediaImage media={media} use="hero" priority sizes="100vw" /></div> : null}
        <div className={s.heroNightText}>{text}</div>
      </section>
    );
  }
  return (
    <section className={s.hero} aria-label="Apresentação">
      <div className={s.heroGrid}>
        <div className={s.heroMedia}>{media ? <MediaImage media={media} use="hero" priority sizes="(min-width: 900px) 60vw, 100vw" /> : null}</div>
        <div className={s.heroText}>{text}</div>
      </div>
    </section>
  );
}

export function Intro({ home }: Props) {
  return (
    <section className={s.intro}>
      <div className={`${s.container} ${s.introGrid}`}>
        <h2 className={s.h2}>{home.intro.title}</h2>
        <div className={s.introBody}>
          <p>{home.intro.body}</p>
          {home.intro.signature ? <p className={s.signature}>{home.intro.signature}</p> : null}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ FEATURED (three compositions) ------------------------------ */
export function Featured({ home, site, menu, basePath }: Props) {
  const items = itemsByIds(menu, home.featuredItemIds);
  if (!items.length) return null;
  const title = home.featured?.title ?? 'Da cozinha';
  const head = (
    <div className={s.featuredHead}>
      <h2 className={s.h2}>{title}</h2>
      <Link className={s.textLink} href={publicUrl(basePath, '/carta')}>{home.featured?.ctaLabel ?? 'Explorar a carta'} <Icon name="arrowRight" size={18} /></Link>
    </div>
  );
  if (site.theme.preset === 'balcao-claro') {
    return (
      <section className={s.featured} style={{ paddingTop: 56 }}>
        <div className={s.container}>
          {head}
          <div className={s.quickGrid}>
            {items.map((i) => (
              <Link key={i.id} className={s.quickCard} href={publicUrl(basePath, `/carta/${i.slug}`)}>
                <span className={s.h3}>{i.name}</span>
                <span className={s.muted}>{i.description}</span>
                <span className={s.price}>{formatEUR(i.priceCents)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className={s.featured}>
      <div className={s.container}>
        <p className={`${s.eyebrow} ${s.sectionLabel}`} style={{ marginBottom: 18 }}>Pratos da casa</p>
        {head}
        <div className={s.featuredGrid}>
          {items.map((i, idx) => (
            <Link key={i.id} href={publicUrl(basePath, `/carta/${i.slug}`)} className={`${s.dish} ${idx > 0 ? s.dishSmall : ''}`}>
              <div className={s.dishMedia}>
                {i.cover ? <MediaImage media={i.cover} use={idx === 0 ? 'detail' : 'card'} sizes={idx === 0 ? '(min-width: 900px) 50vw, 100vw' : '(min-width: 900px) 20vw, 40vw'} /> : null}
              </div>
              <div className={s.dishMeta}>
                <div className={s.dishRow}>
                  <h3 className={s.h3}>{i.name}</h3>
                  <span className={s.price}>{formatEUR(i.priceCents)}</span>
                </div>
                <p className={s.dishDesc}>{i.description}</p>
                {!i.isAvailable ? <span className={s.soldOut}>Esgotado</span> : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- AMBIENCE (three compositions) ------------------------------ */
export function Ambience({ home, site, basePath }: Props) {
  const [a, b] = (home.ambience.mediaIds ?? []).map((id) => site.media[id]).filter(Boolean);
  const text = (
    <div className={s.ambText}>
      <p className={s.eyebrow}>O espaço</p>
      <h2 className={s.h2}>{home.ambience.title}</h2>
      <p className={s.body}>{home.ambience.body}</p>
      <Link className={s.textLink} href={publicUrl(basePath, '/ambiente')}>{home.ambience.linkLabel ?? 'Conhecer o espaço'} <Icon name="arrowRight" size={18} /></Link>
    </div>
  );
  if (site.theme.preset === 'balcao-claro' || !a) {
    return (
      <section className={s.ambience}>
        <div className={`${s.container} ${s.ambStrip}`}>
          {text}
          {a ? <div className={s.ambWide}><MediaImage media={a} use="card" sizes="(min-width: 900px) 50vw, 100vw" /></div> : null}
        </div>
      </section>
    );
  }
  return (
    <section className={s.ambience}>
      <div className={`${s.container} ${s.ambienceGrid}`}>
        <div className={s.ambWide}><MediaImage media={a} use="detail" sizes="(min-width: 900px) 66vw, 100vw" /></div>
        {b ? <div className={s.ambTall}><MediaImage media={b} use="card" sizes="(min-width: 900px) 33vw, 100vw" /></div> : null}
        {text}
      </div>
    </section>
  );
}

export function BarBlock({ home, site, menu, basePath }: Props) {
  const items = itemsByIds(menu, home.bar.itemIds);
  const editorial = (home.bar.mediaIds ?? []).map((id) => site.media[id]).find(Boolean);
  const drinksCategory = menu.categories.find((c) => items[0] && c.id === items[0].categoryId);
  if (!items.length) return null;
  return (
    <section className={s.bar}>
      <div className={`${s.container} ${s.barGrid}`}>
        {editorial ? <div className={s.barMedia}><MediaImage media={editorial} use="card" sizes="(min-width: 900px) 40vw, 100vw" /></div> : <div />}
        <div style={{ display: 'grid', gap: 26 }}>
          <p className={s.eyebrow}>Do bar</p>
          <h2 className={s.h2}>{home.bar.title}</h2>
          <div className={s.barList}>
            {items.map((i) => (
              <Link key={i.id} href={publicUrl(basePath, `/carta/${i.slug}`)} className={s.barItem}>
                <span className={s.barThumb}>{i.cover ? <MediaImage media={i.cover} use="thumb" sizes="88px" /> : null}</span>
                <span>
                  <span className={s.h3} style={{ display: 'block' }}>{i.name}</span>
                  <span className={s.dishDesc}>{i.description}</span>
                </span>
                <span className={s.price}>{formatEUR(i.priceCents)}</span>
              </Link>
            ))}
          </div>
          {drinksCategory ? (
            <Link className={s.textLink} href={publicUrl(basePath, `/carta/categoria/${drinksCategory.slug}`)}>{home.bar.linkLabel ?? drinksCategory.name} <Icon name="arrowRight" size={18} /></Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function Visit({ home, site, basePath }: Props) {
  const c = site.settings.publicContacts;
  return (
    <section className={s.visit}>
      <div className={`${s.container} ${s.visitGrid}`}>
        <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          <p className={s.eyebrow}>Visita</p>
          <h2 className={s.h2}>{home.visit.title}</h2>
          <p className={s.lead}>{c.addressLine ? `${c.addressLine}, ` : ''}{c.city ?? home.visit.body}</p>
          <div className={s.heroCtas}>
            <Link className={s.ctaPrimary} href={publicUrl(basePath, '/reservas')}>Pedir reserva <Icon name="arrowRight" size={18} /></Link>
            <Link className={s.textLink} href={publicUrl(basePath, '/contactos')}>Contactos e horário</Link>
          </div>
        </div>
        <div>
          <h3 className="sr-only">Horário</h3>
          <HoursList site={site} />
          <p className={s.muted} style={{ marginTop: 14, fontSize: '0.9rem' }}>
            Os pedidos à mesa estão disponíveis durante o serviço. Para grupos maiores, envie um pedido de reserva.
          </p>
        </div>
      </div>
    </section>
  );
}
