import type { Metadata } from 'next';
import { FloorPanel } from '@/components/staff/FloorPanel';
import { Forbidden } from '@/components/staff/Forbidden';
import { requireRole } from '@/modules/auth/staff.server';

export const metadata: Metadata = { title: 'Salão' };

export default async function FloorPage({ params }: { params: Promise<{ restaurantSlug: string }> }) {
  const slug = (await params).restaurantSlug;
  const me = await requireRole(slug, ['floor']);
  if (!me) return <Forbidden slug={slug} />;
  return <FloorPanel />;
}
