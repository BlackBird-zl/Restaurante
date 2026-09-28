import type { Metadata } from 'next';
import type { ComponentProps } from 'react';
import { SiteEditor } from '@/components/staff/admin/SiteEditor';
import { requireStaff, staffRpc } from '@/modules/auth/staff.server';
import { publicSiteOrigin } from '@/modules/tenancy/public-origin.server';

export const metadata: Metadata = { title: 'Site e marca · Administração' };

export default async function SiteAdminPage({ params }: { params: Promise<{ restaurantSlug: string }> }) {
  const slug = (await params).restaurantSlug;
  const me = await requireStaff(slug);
  const data = await staffRpc<ComponentProps<typeof SiteEditor>['data']>('staff_get_site_admin', { p_restaurant_slug: slug });
  return <SiteEditor slug={slug} data={data} previewHref={publicSiteOrigin(slug, me.restaurant.primaryHost)} />;
}
