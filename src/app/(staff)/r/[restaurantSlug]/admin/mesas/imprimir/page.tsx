import type { Metadata } from 'next';
import { requireStaff, staffRpc } from '@/modules/auth/staff.server';
import { PrintButton } from '@/components/staff/admin/PrintButton';
import { QrCard } from '../qr-card';
import s from '../print.module.css';

export const metadata: Metadata = { title: 'Imprimir QR das mesas', referrer: 'no-referrer' };
export const dynamic = 'force-dynamic';

export default async function PrintAll({ params }: { params: Promise<{ restaurantSlug: string }> }) {
  const slug = (await params).restaurantSlug;
  const me = await requireStaff(slug);
  const d = await staffRpc<{ tables: { id: string; archivedAt: string | null; qr: unknown }[] }>('staff_admin_tables', { p_restaurant_slug: slug });
  const tables = d.tables.filter((t) => !t.archivedAt && t.qr);
  return (
    <div>
      <div className={s.toolbar}><PrintButton /><span>{tables.length} QR · formato A4 pelo navegador.</span></div>
      <div className={s.sheet}>{tables.map((t) => <QrCard key={t.id} slug={slug} tableId={t.id} restaurantName={me.restaurant.name} />)}</div>
    </div>
  );
}
