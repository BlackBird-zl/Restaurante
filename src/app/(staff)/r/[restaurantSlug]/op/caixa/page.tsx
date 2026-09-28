import type { Metadata } from 'next';
import { CashierPanel } from '@/components/staff/CashierPanel';
import { Forbidden } from '@/components/staff/Forbidden';
import { requireRole } from '@/modules/auth/staff.server';

export const metadata: Metadata = { title: 'Caixa' };

export default async function CashierPage({ params }: { params: Promise<{ restaurantSlug: string }> }) {
  const slug = (await params).restaurantSlug;
  const me = await requireRole(slug, ['cashier']);
  if (!me) return <Forbidden slug={slug} />;
  return <CashierPanel />;
}
