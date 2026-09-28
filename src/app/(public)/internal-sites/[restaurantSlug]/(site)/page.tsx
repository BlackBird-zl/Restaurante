import type { Metadata } from 'next';
import { Ambience, BarBlock, Featured, Hero, Intro, Visit } from '@/components/public/HomeSections';
import { getPublicContext } from '@/modules/tenancy/context.server';
import { getMenu, getSite } from '@/modules/site/queries.server';
import { pageMetadata } from '@/modules/site/metadata';
import { WEEKDAYS } from '@/lib/time';

type Params = { params: Promise<{ restaurantSlug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const ctx = await getPublicContext((await params).restaurantSlug);
  const site = await getSite(ctx.restaurantId);
  const home = site.pages.home;
  return pageMetadata(ctx, site, {
    title: undefined, path: '/',
    description: home ? `${home.hero.title} ${home.hero.body ?? ''}`.trim() : undefined,
    image: home?.hero.mediaId ? site.media[home.hero.mediaId] : null,
  });
}

export default async function HomePage({ params }: Params) {
  const ctx = await getPublicContext((await params).restaurantSlug);
  const [site, menu] = await Promise.all([getSite(ctx.restaurantId), getMenu(ctx.restaurantId)]);
  const home = site.pages.home;
  if (!home) return null;
  const props = { home, site, menu, basePath: ctx.basePath };
  // JSON-LD only with factual, configured fields (no reviews, address or coordinates in the demo).
  const days: Record<string, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Restaurant', name: site.restaurant.name, url: ctx.primaryOrigin || undefined,
    servesCuisine: site.theme.preset === 'casa-editorial' ? 'Portuguesa' : undefined,
    openingHoursSpecification: WEEKDAYS.flatMap((d) => (site.settings.weeklyHours[d.key] ?? []).map(([opens, closes]) => ({
      '@type': 'OpeningHoursSpecification', dayOfWeek: days[d.key], opens, closes,
    }))),
    telephone: site.settings.publicContacts.phone ?? undefined,
  };
  return (
    <>
      <script type="application/ld+json" nonce={ctx.nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <Hero {...props} />
      <Intro {...props} />
      <Featured {...props} />
      <Ambience {...props} />
      <BarBlock {...props} />
      <Visit {...props} />
    </>
  );
}
