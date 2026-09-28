import type { Metadata } from 'next';
import { ProductForm } from '@/components/staff/admin/ProductForm';
import type { AdminMenu } from '@/components/staff/admin/menu-types';
import { staffRpc } from '@/modules/auth/staff.server';

export const metadata: Metadata = { title: 'Novo produto · Administração' };

export default async function NewProductPage({ params }: { params: Promise<{ restaurantSlug: string }> }) {
  const slug = (await params).restaurantSlug;
  const menu = await staffRpc<AdminMenu>('staff_admin_menu', { p_restaurant_slug: slug });
  return <ProductForm slug={slug} menu={menu} item={null} media={[]} />;
}
