import type { Metadata } from 'next';
import { requireStaff } from '@/modules/auth/staff.server';
import { PrintButton } from '@/components/staff/admin/PrintButton';
import { QrCard } from '../../qr-card';
import s from '../../print.module.css';

export const metadata: Metadata = { title: 'Imprimir QR', referrer: 'no-referrer' };
export const dynamic = 'force-dynamic';

export default async function PrintQr({ params }: { params: Promise<{ restaurantSlug: string; tableId: string }> }) {
  const p = await params;
  const me = await requireStaff(p.restaurantSlug);
  return (
    <div>
      <div className={s.toolbar}><PrintButton /><span>Reimpressão: o token do QR não muda. Faça uma leitura de teste antes de colocar na mesa.</span></div>
      <div className={s.sheet}><QrCard slug={p.restaurantSlug} tableId={p.tableId} restaurantName={me.restaurant.name} /></div>
    </div>
  );
}
