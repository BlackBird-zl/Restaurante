import QRCode from 'qrcode';
import { staffClient } from '@/lib/supabase/server';
import { rpc } from '@/lib/supabase/rpc';
import { decryptQr } from '@/lib/security/crypto.server';
import { tableQrUrl } from '@/modules/tables/qr.server';
import s from './print.module.css';

/** Printable QR card: restaurant name, table, black-on-white QR (EC level M, 4-module quiet zone), instruction. */
export async function QrCard({ slug, tableId, restaurantName }: { slug: string; tableId: string; restaurantName: string }) {
  const client = await staffClient();
  const secret = await rpc<{ ciphertext: string; label: string; publicSlug: string }>(client, 'staff_get_qr_secret', { p_restaurant_slug: slug, p_table_id: tableId });
  const url = await tableQrUrl(client, slug, secret.publicSlug, decryptQr(secret.ciphertext));
  const svg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 4, color: { dark: '#000000', light: '#FFFFFF' } });
  return (
    <article className={s.card}>
      <p className={s.name}>{restaurantName}</p>
      <p className={s.table}>Mesa {secret.label}</p>
      <div className={s.qr} dangerouslySetInnerHTML={{ __html: svg }} role="img" aria-label={`Código QR da mesa ${secret.label}`} />
      <p className={s.hint}>Veja a carta. Para pedir, peça o código à equipa.</p>
    </article>
  );
}
