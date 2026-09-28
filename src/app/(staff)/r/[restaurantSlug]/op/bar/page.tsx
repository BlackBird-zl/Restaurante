import type { Metadata } from 'next';
import { StationPanel } from '@/components/staff/StationPanel';
import { Forbidden } from '@/components/staff/Forbidden';
import { requireStaff } from '@/modules/auth/staff.server';

export const metadata: Metadata = { title: 'Bar' };

/** The station comes from the member's permissions; admins choose explicitly (?estacao=CODE), re-checked by the RPC. */
export default async function StationPage({ params, searchParams }: { params: Promise<{ restaurantSlug: string }>; searchParams: Promise<{ estacao?: string }> }) {
  const slug = (await params).restaurantSlug;
  const me = await requireStaff(slug);
  const stations = me.stations.filter((s) => s.kind === 'bar');
  if (!stations.length) return <Forbidden slug={slug} />;
  const wanted = (await searchParams).estacao?.toUpperCase();
  const station = stations.find((s) => s.code === wanted) ?? stations.find((s) => s.assigned) ?? stations[0]!;
  return <StationPanel stationCode={station.code} stations={stations.map((s) => ({ code: s.code, name: s.name }))} />;
}
