import type { MediaDTO } from '@/modules/menu/types';
import type { WeeklyHours } from '@/lib/time';

export type Preset = 'casa-editorial' | 'balcao-claro' | 'noite-grafica';
export type ThemeTokens = {
  color: { background: string; surface: string; text: string; muted: string; accent: string; border: string };
  fontPair: 'newsreader-plex' | 'plex-only';
  radius: '0' | '4' | '8';
  density: 'comfortable' | 'compact';
};

export type HomePage = {
  hero: { eyebrow?: string; title: string; body?: string; mediaId?: string | null; primaryLink?: string; primaryLabel?: string; secondaryLink?: string; secondaryLabel?: string };
  intro: { title: string; body: string; signature?: string };
  featured?: { title?: string; ctaLabel?: string };
  featuredItemIds: string[];
  ambience: { title: string; body: string; mediaIds: string[]; linkLabel?: string };
  bar: { title: string; itemIds: string[]; mediaIds?: string[]; linkLabel?: string };
  visit: { title: string; body?: string };
  footer?: { note?: string };
};
export type AboutPage = { title: string; intro: string; paragraphs: string[]; mediaIds: string[]; signature?: string; conceptNote?: string };
export type AmbiencePage = { title: string; intro: string; images: { mediaId: string; caption?: string }[] };
export type ContactPage = { title: string; intro: string };
export type ReservationsPage = { title: string; body: string; demoNotice?: string };
export type PrivacyPage = { title: string; sections: { title: string; body: string }[] };

export type SitePages = {
  home?: HomePage; about?: AboutPage; ambience?: AmbiencePage; contact?: ContactPage; reservations?: ReservationsPage; privacy?: PrivacyPage;
};

export type PublicContacts = { phone?: string | null; email?: string | null; addressLine?: string | null; city?: string | null; mapUrl?: string | null; instagram?: string | null };

export type SiteDTO = {
  restaurant: { id: string; slug: string; name: string; isDemo: boolean; timezone: string; businessDayStart: string; primaryHost: string | null };
  theme: { preset: Preset; tokens: ThemeTokens; version: number };
  pages: SitePages;
  settings: { orderingMode: 'open' | 'paused' | 'closed'; publicContacts: PublicContacts; weeklyHours: WeeklyHours; reservationRules: Record<string, unknown> };
  media: Record<string, MediaDTO>;
};
