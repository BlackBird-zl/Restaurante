import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { Client, staffApi } from './http';

/** Downloads the printable PNG like an admin would and decodes it (proves the QR is scannable). */
export async function tableQrUrl(admin: Client, slug: string, tableId: string): Promise<URL> {
  const r = await admin.get(`${staffApi(slug)}/tables/${tableId}/qr?format=png`);
  if (r.status !== 200) throw new Error(`qr png ${r.status}`);
  const img = PNG.sync.read(r.body);
  const code = jsQR(new Uint8ClampedArray(img.data), img.width, img.height);
  if (!code) throw new Error('QR not decodable');
  return new URL(code.data);
}
