import type { Metadata } from 'next';
import type { ComponentProps } from 'react';
import { TableManager } from '@/components/staff/admin/Managers';
import { staffRpc } from '@/modules/auth/staff.server';

export const metadata: Metadata = { title: 'Mesas e QR · Administração' };

export default async function TablesPage({ params }: { params: Promise<{ restaurantSlug: string }> }) {
  const slug = (await params).restaurantSlug;
  const d = await staffRpc<{ tables: ComponentProps<typeof TableManager>['tables'] }>('staff_admin_tables', { p_restaurant_slug: slug });
  return <TableManager slug={slug} tables={d.tables} />;
}
