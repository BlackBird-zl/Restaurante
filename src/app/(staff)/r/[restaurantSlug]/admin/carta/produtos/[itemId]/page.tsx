import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductForm } from '@/components/staff/admin/ProductForm';
import type { AdminMedia, AdminMenu } from '@/components/staff/admin/menu-types';
import { staffRpc } from '@/modules/auth/staff.server';

export const metadata: Metadata = { title: 'Produto · Administração' };

export default async function ProductPage({ params }: { params: Promise<{ restaurantSlug: string; itemId: string }> }) {
  const p = await params;
  const [menu, site] = await Promise.all([
    staffRpc<AdminMenu>('staff_admin_menu', { p_restaurant_slug: p.restaurantSlug }),
    staffRpc<{ media: AdminMedia[] }>('staff_get_site_admin', { p_restaurant_slug: p.restaurantSlug }),
  ]);
  const item = menu.items.find((i) => i.id === p.itemId);
  if (!item) notFound();
  return <ProductForm key={`${item.id}:${item.version}`} slug={p.restaurantSlug} menu={menu} item={item} media={site.media} />;
}
