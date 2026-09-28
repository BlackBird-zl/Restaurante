import type { Metadata } from 'next';
import { ProductList } from '@/components/staff/admin/ProductList';
import type { AdminMenu } from '@/components/staff/admin/menu-types';
import { staffRpc } from '@/modules/auth/staff.server';

export const metadata: Metadata = { title: 'Produtos · Administração' };

export default async function ProductsPage({ params }: { params: Promise<{ restaurantSlug: string }> }) {
  const slug = (await params).restaurantSlug;
  const menu = await staffRpc<AdminMenu>('staff_admin_menu', { p_restaurant_slug: slug });
  return <ProductList slug={slug} menu={menu} />;
}
