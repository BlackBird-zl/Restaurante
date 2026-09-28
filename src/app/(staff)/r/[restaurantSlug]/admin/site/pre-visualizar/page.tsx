import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { Ambience, BarBlock, Featured, Hero, Intro, Visit } from '@/components/public/HomeSections';
import { RestaurantShell } from '@/components/public/RestaurantShell';
import { Notice, btnClass } from '@/components/ui/basic';
import { requireStaff, staffRpc } from '@/modules/auth/staff.server';
import { getMenu } from '@/modules/site/queries.server';
import type { SiteDTO } from '@/modules/site/types';
import type { PublicTenantContext } from '@/modules/tenancy/context.server';
import { publicSiteOrigin } from '@/modules/tenancy/public-origin.server';

export const metadata: Metadata = { title: 'Pré-visualização · Site', robots: { index: false, follow: false } };

/** Renders the DRAFT pages + draft theme with the published menu. Only visible to members; never cached publicly. */
export default async function SitePreviewPage({ params }: { params: Promise<{ restaurantSlug: string }> }) {
  const slug = (await params).restaurantSlug;
  const me = await requireStaff(slug);
  const { preview } = await staffRpc<{ preview: SiteDTO }>('staff_get_site_admin', { p_restaurant_slug: slug });
  const menu = await getMenu(preview.restaurant.id);
  const origin = publicSiteOrigin(slug, me.restaurant.primaryHost);
  const ctx: PublicTenantContext = {
    kind: 'public', restaurantId: preview.restaurant.id, slug, name: preview.restaurant.name,
    basePath: origin, host: '', origin, primaryOrigin: origin, isDemo: preview.restaurant.isDemo, isPreview: true,
    nonce: (await headers()).get('x-nonce') ?? '',
  };
  const home = preview.pages.home;
  const props = home ? { home, site: preview, menu, basePath: origin } : null;
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Notice tone="info">
        Pré-visualização do rascunho (páginas e tema ainda não publicados). Os links abrem o site publicado.{' '}
        <Link href={`/r/${slug}/admin/site`} className={btnClass('ghost', 'md')}>Voltar ao editor</Link>
      </Notice>
      <div style={{ border: '1px solid var(--n-200)', borderRadius: 12, overflow: 'hidden' }}>
        <RestaurantShell ctx={ctx} site={preview}>
          {props ? (<><Hero {...props} /><Intro {...props} /><Featured {...props} /><Ambience {...props} /><BarBlock {...props} /><Visit {...props} /></>) : null}
        </RestaurantShell>
      </div>
    </div>
  );
}
