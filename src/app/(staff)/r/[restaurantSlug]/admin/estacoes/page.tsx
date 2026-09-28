import type { Metadata } from 'next';
import type { ComponentProps } from 'react';
import { StationManager } from '@/components/staff/admin/Managers';
import { staffRpc } from '@/modules/auth/staff.server';

export const metadata: Metadata = { title: 'Estações · Administração' };

export default async function StationsPage({ params }: { params: Promise<{ restaurantSlug: string }> }) {
  const d = await staffRpc<{ stations: ComponentProps<typeof StationManager>['stations'] }>('staff_admin_stations', { p_restaurant_slug: (await params).restaurantSlug });
  return <StationManager stations={d.stations} />;
}
