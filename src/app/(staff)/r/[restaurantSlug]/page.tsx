import { redirect } from 'next/navigation';
import { workspaces } from '@/components/staff/StaffShell';
import { requireStaff } from '@/modules/auth/staff.server';

/** Lands each member on their first workspace (admin → administração). */
export default async function StaffHome({ params }: { params: Promise<{ restaurantSlug: string }> }) {
  const me = await requireStaff((await params).restaurantSlug);
  const ws = workspaces(me);
  const admin = ws.find((w) => w.href.endsWith('/admin'));
  redirect((admin ?? ws[0])?.href ?? '/restaurantes');
}
