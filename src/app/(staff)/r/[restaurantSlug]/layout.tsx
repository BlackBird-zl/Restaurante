import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { StaffShell } from '@/components/staff/StaffShell';
import { requireStaff } from '@/modules/auth/staff.server';

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function StaffLayout({ children, params }: { children: ReactNode; params: Promise<{ restaurantSlug: string }> }) {
  const me = await requireStaff((await params).restaurantSlug);
  return <StaffShell me={me}>{children}</StaffShell>;
}
