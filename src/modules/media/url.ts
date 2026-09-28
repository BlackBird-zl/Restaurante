import type { MediaDTO, MediaVariant } from '@/modules/menu/types';

const STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/restaurant-media-public`;

/** Maps a storage key to a URL. `static/…` keys are versioned demo assets served from /public. */
export function mediaKeyUrl(key: string): string {
  if (key.startsWith('static/')) return `/${key.slice('static/'.length)}`;
  return `${STORAGE_BASE}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

const ORDER: Record<string, string[]> = {
  hero: ['hero_desktop', 'detail', 'original'],
  heroMobile: ['hero_mobile', 'hero_desktop', 'detail', 'original'],
  card: ['card', 'detail', 'original'],
  detail: ['detail', 'card', 'original'],
  thumb: ['thumb', 'card', 'original'],
};

export function pickVariants(media: MediaDTO, use: keyof typeof ORDER): MediaVariant[] {
  for (const role of ORDER[use]!) {
    const vs = media.variants.filter((v) => v.role === role);
    if (vs.length) return vs;
  }
  return [];
}

export function isPlaceholder(media: MediaDTO | null | undefined): boolean {
  return media?.sourceType === 'placeholder';
}
