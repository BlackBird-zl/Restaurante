import type { NextRequest } from 'next/server';
import sharp, { type Metadata as SharpMetadata } from 'sharp';
import { z } from 'zod';
import { ApiError, assertSameOrigin, handleError, idempotencyKey, ok } from '@/lib/http/server';
import { getStaffClaims, staffClient } from '@/lib/supabase/server';
import { privilegedClient } from '@/lib/supabase/privileged';
import { rpc } from '@/lib/supabase/rpc';

export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(['jpeg', 'png', 'webp', 'avif', 'heif']);
const BUCKET = 'restaurant-media-public';
const Meta = z.strictObject({
  purpose: z.enum(['product', 'hero', 'ambience', 'editorial']),
  alt: z.string().trim().min(3).max(160),
});

type Variant = { role: string; storageKey: string; mime: string; width: number; height: number; bytes: number };

/** Magic-byte check (independent of the declared Content-Type and file name). */
function sniff(buf: Buffer): 'jpeg' | 'png' | 'webp' | 'avif' | null {
  if (buf.length < 16) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (buf.subarray(4, 8).toString('latin1') === 'ftyp' && /avif|avis/.test(buf.subarray(8, 12).toString('latin1'))) return 'avif';
  return null;
}

/**
 * Upload: member authorization via RPC (member JWT) → server validation (size, signature, decodable,
 * dimensions) → EXIF/GPS stripped by re-encoding → WebP + JPEG variants → Storage (service role, server only)
 * → system_register_media. The original file is never stored or exposed.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ restaurantSlug: string }> }) {
  try {
    const { restaurantSlug: slug } = await params;
    const client = await staffClient();
    if (!(await getStaffClaims(client))) throw new ApiError('AUTH_REQUIRED');
    assertSameOrigin(req);
    const key = idempotencyKey(req);
    const len = Number(req.headers.get('content-length') ?? '0');
    if (len > MAX_BYTES + 64 * 1024) throw new ApiError('INVALID_INPUT', { reason: 'file_too_large' });

    const auth = await rpc<{ restaurantId: string; memberId: string }>(client, 'staff_authorize_media_upload', { p_restaurant_slug: slug });

    let form: FormData;
    try { form = await req.formData(); } catch { throw new ApiError('INVALID_INPUT', { reason: 'invalid_form' }); }
    const meta = Meta.parse({ purpose: form.get('purpose'), alt: form.get('alt') });
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) throw new ApiError('INVALID_INPUT', { reason: 'file_missing' });
    if (file.size > MAX_BYTES) throw new ApiError('INVALID_INPUT', { reason: 'file_too_large' });
    const buf = Buffer.from(await file.arrayBuffer());
    const kind = sniff(buf);
    if (!kind) throw new ApiError('INVALID_INPUT', { reason: 'unsupported_type' });

    let info: SharpMetadata;
    try { info = await sharp(buf, { failOn: 'error', limitInputPixels: 50_000_000 }).metadata(); } catch { throw new ApiError('INVALID_INPUT', { reason: 'corrupt_image' }); }
    if (!info.format || !ALLOWED.has(info.format) || !info.width || !info.height) throw new ApiError('INVALID_INPUT', { reason: 'unsupported_type' });
    if (info.width < 400 || info.height < 300) throw new ApiError('INVALID_INPUT', { reason: 'image_too_small' });
    if (info.width > 12000 || info.height > 12000) throw new ApiError('INVALID_INPUT', { reason: 'image_too_large' });

    // Autorotate from EXIF, then re-encode: sharp drops EXIF/XMP/GPS unless withMetadata() is called.
    const base = sharp(buf, { failOn: 'error' }).rotate();
    const specs: { role: string; width: number; height?: number }[] = meta.purpose === 'hero'
      ? [{ role: 'hero_desktop', width: 2400 }, { role: 'hero_mobile', width: 1080, height: 1350 }, { role: 'card', width: 800 }, { role: 'thumb', width: 320 }]
      : [{ role: 'detail', width: 1600 }, { role: 'card', width: 800 }, { role: 'thumb', width: 320 }];
    const prefix = `${auth.restaurantId}/${meta.purpose}/${key}`;
    const storage = privilegedClient().storage.from(BUCKET);
    const variants: Variant[] = [];
    for (const spec of specs) {
      const resized = base.clone().resize({ width: spec.width, height: spec.height, fit: spec.height ? 'cover' : 'inside', withoutEnlargement: !spec.height });
      for (const fmt of ['webp', 'jpeg'] as const) {
        if (spec.role === 'thumb' && fmt === 'jpeg') continue;
        const { data, info: out } = await (fmt === 'webp' ? resized.clone().webp({ quality: 80 }) : resized.clone().jpeg({ quality: 82, mozjpeg: true }))
          .toBuffer({ resolveWithObject: true });
        const storageKey = `${prefix}/${spec.role}.${fmt === 'jpeg' ? 'jpg' : 'webp'}`;
        const up = await storage.upload(storageKey, data, { contentType: `image/${fmt}`, cacheControl: '31536000', upsert: false });
        if (up.error) {
          if (/exists|duplicate/i.test(up.error.message)) throw new ApiError('CONFLICT', { reason: 'duplicate_upload' });
          console.error('[media] storage upload failed', up.error.message.slice(0, 120));
          throw new ApiError('SERVICE_UNAVAILABLE', { reason: 'storage_unavailable' });
        }
        variants.push({ role: spec.role, storageKey, mime: `image/${fmt}`, width: out.width, height: out.height, bytes: out.size });
      }
    }
    const main = variants.find((v) => (v.role === 'detail' || v.role === 'hero_desktop') && v.mime === 'image/webp')!;
    const result = await rpc(privilegedClient(), 'system_register_media', {
      p_restaurant_id: auth.restaurantId, p_member_id: auth.memberId,
      p_asset: { storageKey: main.storageKey, purpose: meta.purpose, mime: main.mime, bytes: main.bytes, width: main.width, height: main.height,
        alt: meta.alt, sourceNote: `upload (${kind}, ${info.width}×${info.height}); original not retained` },
      p_variants: variants,
    });
    return ok(result, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
