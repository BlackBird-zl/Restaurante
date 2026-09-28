import type { Metadata } from 'next';
import { CategoryManager } from '@/components/staff/admin/Managers';
import type { AdminMenu } from '@/components/staff/admin/menu-types';
import { staffRpc } from '@/modules/auth/staff.server';

export const metadata: Metadata = { title: 'Categorias · Administração' };

export default async function CategoriesPage({ params }: { params: Promise<{ restaurantSlug: string }> }) {
  const menu = await staffRpc<AdminMenu>('staff_admin_menu', { p_restaurant_slug: (await params).restaurantSlug });
  return <CategoryManager categories={menu.categories} />;
}
