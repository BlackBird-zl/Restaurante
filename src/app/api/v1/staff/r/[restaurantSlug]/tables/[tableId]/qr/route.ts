import { z } from 'zod';
import QRCode from 'qrcode';
import { ApiError, fail, handleError } from '@/lib/http/server';
import { decryptQr, encryptQr, randomToken, sha256Hex } from '@/lib/security/crypto.server';
import { getStaffClaims, staffClient } from '@/lib/supabase/server';
import { rpc } from '@/lib/supabase/rpc';
import { call, staffHandler } from '@/modules/auth/staff-route.server';
import { tableQrUrl } from '@/modules/tables/qr.server';

const Body = z.strictObject({ version: z.number().int().min(1), confirmImpact: z.boolean(), revokeSessions: z.boolean().default(true) });

/** Issue the first QR or rotate it (revokes the previous one; confirmation of impact required). */
export const POST = staffHandler({
  mutation: true, body: Body,
  run: async ({ client, slug, key, params }, b) => {
    const token = randomToken(32);
    const enc = encryptQr(token);
    return call(client, 'staff_rotate_qr', {
      p_restaurant_slug: slug, p_table_id: params.tableId, p_expected_version: b.version, p_token_hash: sha256Hex(token),
      p_token_ciphertext: enc.ciphertext, p_key_version: enc.keyVersion, p_confirm_impact: b.confirmImpact,
      p_revoke_sessions: b.revokeSessions, p_idempotency_key: key,
    });
  },
});

/** QR artwork for printing (admin only). Reprint keeps the same token. SVG or PNG, error correction M, 4-module quiet zone. */
export async function GET(req: Request, { params }: { params: Promise<{ restaurantSlug: string; tableId: string }> }) {
  try {
    const p = await params;
    const client = await staffClient();
    if (!(await getStaffClaims(client))) throw new ApiError('AUTH_REQUIRED');
    const secret = await rpc<{ ciphertext: string; label: string; publicSlug: string }>(client, 'staff_get_qr_secret', {
      p_restaurant_slug: p.restaurantSlug, p_table_id: p.tableId,
    });
    const url = await tableQrUrl(client, p.restaurantSlug, secret.publicSlug, decryptQr(secret.ciphertext));
    const format = new URL(req.url).searchParams.get('format') === 'png' ? 'png' : 'svg';
    const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' };
    if (format === 'png') {
      const png = await QRCode.toBuffer(url, { errorCorrectionLevel: 'M', margin: 4, width: 1024, color: { dark: '#000000', light: '#FFFFFF' } });
      return new Response(new Uint8Array(png), { headers: { ...headers, 'Content-Type': 'image/png', 'Content-Disposition': `inline; filename="mesa-${secret.label}.png"` } });
    }
    const svg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 4, color: { dark: '#000000', light: '#FFFFFF' } });
    return new Response(svg, { headers: { ...headers, 'Content-Type': 'image/svg+xml' } });
  } catch (e) {
    if (e instanceof ApiError) return fail(e.code, e.details, e.status);
    return handleError(e);
  }
}
