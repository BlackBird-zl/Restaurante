import { z } from 'zod';

/** Structured content schemas (Arquitetura §13.2). No HTML, no URLs: CTAs are internal enums. */
const text = (max: number) => z.string().trim().max(max).refine((v) => !/<[^>]*>/.test(v), 'Sem HTML.');
const cta = z.enum(['carta', 'reservas', 'ambiente', 'sobre', 'contactos']);
const id = z.uuid();

export const HomeSchema = z.strictObject({
  hero: z.strictObject({ eyebrow: text(60).optional(), title: text(60).min(1), body: text(140).optional(), mediaId: id.nullable().optional(),
    primaryLink: cta.optional(), primaryLabel: text(30).optional(), secondaryLink: cta.optional(), secondaryLabel: text(30).optional() }),
  intro: z.strictObject({ title: text(120), body: text(600), signature: text(80).optional() }),
  featured: z.strictObject({ title: text(60).optional(), ctaLabel: text(30).optional() }).optional(),
  featuredItemIds: z.array(id).length(3),
  ambience: z.strictObject({ title: text(120), body: text(600), mediaIds: z.array(id).max(2), linkLabel: text(30).optional() }),
  bar: z.strictObject({ title: text(120), itemIds: z.array(id).max(2), mediaIds: z.array(id).max(1).optional(), linkLabel: text(30).optional() }),
  visit: z.strictObject({ title: text(60), body: text(160).optional() }),
  footer: z.strictObject({ note: text(160).optional() }).optional(),
});
export const AboutSchema = z.strictObject({ title: text(80), intro: text(600), paragraphs: z.array(text(600)).max(2), mediaIds: z.array(id).max(2),
  signature: text(80).optional(), conceptNote: text(300).optional() });
export const AmbienceSchema = z.strictObject({ title: text(80), intro: text(600), images: z.array(z.strictObject({ mediaId: id, caption: text(160).optional() })).max(8) });
export const ContactSchema = z.strictObject({ title: text(80), intro: text(600) });
export const ReservationsSchema = z.strictObject({ title: text(80), body: text(600), demoNotice: text(160).optional() });
export const PrivacySchema = z.strictObject({ title: text(80), sections: z.array(z.strictObject({ title: text(120), body: text(600) })).max(12) });

export const PAGE_SCHEMAS = {
  home: HomeSchema, about: AboutSchema, ambience: AmbienceSchema, contact: ContactSchema, reservations: ReservationsSchema, privacy: PrivacySchema,
} as const;

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
export const ThemeTokensSchema = z.strictObject({
  color: z.strictObject({ background: hex, surface: hex, text: hex, muted: hex, accent: hex, border: hex }),
  fontPair: z.enum(['newsreader-plex', 'plex-only']),
  radius: z.enum(['0', '4', '8']),
  density: z.enum(['comfortable', 'compact']),
});
