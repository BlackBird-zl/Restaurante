import type { Metadata } from 'next';
import type { ComponentProps } from 'react';
import { TeamManager } from '@/components/staff/admin/Managers';
import { staffRpc } from '@/modules/auth/staff.server';

export const metadata: Metadata = { title: 'Equipa · Administração' };

export default async function TeamPage({ params }: { params: Promise<{ restaurantSlug: string }> }) {
  const d = await staffRpc<ComponentProps<typeof TeamManager>['data']>('staff_admin_members', { p_restaurant_slug: (await params).restaurantSlug });
  return <TeamManager data={d} />;
}
