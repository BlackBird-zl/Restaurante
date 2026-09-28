import type { Metadata } from 'next';
import type { ComponentProps } from 'react';
import { ReservationsManager } from '@/components/staff/admin/ReservationsManager';
import { requireStaff, staffRpc } from '@/modules/auth/staff.server';

export const metadata: Metadata = { title: 'Reservas · Administração' };

export default async function ReservationsPage({ params }: { params: Promise<{ restaurantSlug: string }> }) {
  const slug = (await params).restaurantSlug;
  const me = await requireStaff(slug);
  const d = await staffRpc<{ reservations: ComponentProps<typeof ReservationsManager>['reservations'] }>('staff_list_reservations', { p_restaurant_slug: slug, p_status: null, p_from: null, p_to: null });
  return <ReservationsManager reservations={d.reservations} isDemo={me.restaurant.isDemo} />;
}
