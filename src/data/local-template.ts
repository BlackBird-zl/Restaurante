import 'server-only';
import { patio } from '../../fixtures/patio-do-ferro/data';
import { balcao } from '../../fixtures/balcao-do-largo/data';
import { visualAssets } from '../../fixtures/patio-do-ferro/visual-assets';
import type { MenuDTO, MediaDTO } from '@/modules/menu/types';
import type { SiteDTO } from '@/modules/site/types';

const fixtures = [patio, balcao] as const;
type Fixture = (typeof fixtures)[number];


const pexelsPhotoIds: Record<string, string> = {
  '01': '36125043', '02': '17056975', '03': '14108254', '04': '36430075',
  '05': '30729111', '06': '33389174', '07': '8583123', '08': '35258949',
  '09': '35424017', '10': '17205215', '11': '20323432', '12': '33573597',
  '13': '38681384', '14': '34283283', '15': '10134725', '16': '14537701',
  '17': '6612869', '18': '27998840', '19': '8272622', '20': '14270807',
  '21': '36183197', '22': '17322388', '23': '16021245', '24': '33746241',
  '25': '1850008', '26': '6542761', '27': '8879617', '28': '5659578',
  '29': '9386469', '30': '225236', '31': '37029476', '32': '36617897',
};

function pexelsUrl(id: string, width = 1600): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
}

const mediaId = (id: string) => `media-${id}`;
const itemId = (id: string) => id;

function resolveRefs<T>(value: T): T {
  if (typeof value === 'string') {
    if (value.startsWith('@media:')) return mediaId(value.slice(7)) as T;
    if (value.startsWith('@item:')) return itemId(value.slice(6)) as T;
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => resolveRefs(v)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, resolveRefs(v)])) as T;
  }
  return value;
}

const ratioDims: Record<string, [number, number]> = {
  '16:9': [1600, 900], '4:5': [1200, 1500], '1:1': [1200, 1200],
};

function patioMedia(): Record<string, MediaDTO> {
  const out: Record<string, MediaDTO> = {};
  for (const a of visualAssets) {
    const [width, height] = ratioDims[a.ratio] ?? [1200, 1200];
    const photoId = pexelsPhotoIds[a.id];
    if (!photoId) throw new Error(`Missing licensed media mapping for asset ${a.id}`);
    out[mediaId(a.id)] = {
      id: mediaId(a.id),
      key: pexelsUrl(photoId, 1600),
      alt: a.alt,
      width, height,
      focalX: 0.5, focalY: 0.5,
      sourceType: 'licensed',
      mime: 'image/jpeg',
      variants: [
        { role: a.purpose === 'hero' ? 'hero_desktop' : 'detail', key: pexelsUrl(photoId, 1600), mime: 'image/jpeg', width, height },
        { role: 'card', key: pexelsUrl(photoId, 900), mime: 'image/jpeg', width: Math.min(width, 900), height: Math.round(Math.min(width, 900) * (height / width)) },
        { role: 'thumb', key: pexelsUrl(photoId, 420), mime: 'image/jpeg', width: Math.min(width, 420), height: Math.round(Math.min(width, 420) * (height / width)) },
      ],
    };
  }
  return out;
}

function fixtureForSlug(slug: string): Fixture | null {
  return fixtures.find((f) => f.slug === slug) ?? null;
}

function fixtureForId(id: string): Fixture | null {
  return fixtures.find((f) => localRestaurantId(f.slug) === id) ?? null;
}

export function localRestaurantId(slug: string): string {
  return `local:${slug}`;
}

export function listLocalTenants() {
  return fixtures.map((f) => ({ restaurantId: localRestaurantId(f.slug), slug: f.slug, name: f.name, isDemo: true, primaryHost: null }));
}

export function getLocalTenantBySlug(slug: string) {
  const f = fixtureForSlug(slug);
  return f ? { restaurantId: localRestaurantId(f.slug), slug: f.slug, name: f.name, isDemo: true, primaryHost: null } : null;
}

export function getLocalSite(restaurantId: string): SiteDTO | null {
  const f = fixtureForId(restaurantId);
  if (!f) return null;
  const media = f.slug === 'patio-do-ferro' ? patioMedia() : {};
  return {
    restaurant: {
      id: restaurantId, slug: f.slug, name: f.name, isDemo: true, timezone: 'Europe/Lisbon', businessDayStart: '05:00', primaryHost: null,
    },
    theme: { preset: f.preset, tokens: f.tokens, version: 1 },
    pages: resolveRefs(f.pages),
    settings: {
      orderingMode: 'open', publicContacts: f.publicContacts, weeklyHours: f.weeklyHours,
      reservationRules: { mode: 'demo', note: 'Template local: pedidos de reserva não são enviados.' },
    },
    media,
  } as unknown as SiteDTO;
}

export function getLocalMenu(restaurantId: string): MenuDTO | null {
  const f = fixtureForId(restaurantId);
  if (!f) return null;
  const media = f.slug === 'patio-do-ferro' ? patioMedia() : {};
  const categories = f.categories.map((c, index) => ({ id: `cat:${c.slug}`, slug: c.slug, name: c.name, description: c.description, sortOrder: index + 1 }));
  const assetsByProduct = new Map(visualAssets.filter((a) => a.productId).map((a) => [a.productId!, a]));
  const unavailable = new Set('unavailable' in f ? [...f.unavailable] : []);
  const items = f.items.map((row, index) => {
    const [id, slug, categorySlug, name, description, ingredients, priceCents, , allergens, isVegetarian, containsAlcohol] = row;
    const asset = assetsByProduct.get(id);
    return {
      id, slug, categoryId: `cat:${categorySlug}`, categorySlug, name, description, ingredients,
      allergens: [...allergens], isVegetarian, containsAlcohol, priceCents, isAvailable: !unavailable.has(id),
      version: 1, sortOrder: index + 1, cover: asset ? media[mediaId(asset.id)] ?? null : null,
    };
  });
  return { categories, items };
}

export function getLocalTable(restaurantId: string, label: string) {
  const f = fixtureForId(restaurantId);
  const t = f?.tables.find((table) => table.label.toLowerCase() === label.toLowerCase());
  return t ? { label: t.label, publicSlug: t.label.toLowerCase() } : null;
}
