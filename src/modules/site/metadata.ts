import type { Metadata } from 'next';
import type { PublicTenantContext } from '@/modules/tenancy/context.server';
import type { SiteDTO } from './types';
import type { MediaDTO } from '@/modules/menu/types';
import { mediaKeyUrl, pickVariants } from '@/modules/media/url';

/** Title/description/canonical per page and tenant; demo and preview are always noindex. */
export function pageMetadata(ctx: PublicTenantContext, site: SiteDTO, opts: {
  title?: string; description?: string; path: string; image?: MediaDTO | null;
}): Metadata {
  const name = site.restaurant.name;
  const canonical = `${ctx.primaryOrigin}${opts.path === '/' ? '' : opts.path}` || undefined;
  const noindex = site.restaurant.isDemo || ctx.isPreview;
  const img = opts.image && opts.image.sourceType !== 'placeholder' ? pickVariants(opts.image, 'detail')[0] : undefined;
  return {
    title: opts.title ? `${opts.title} · ${name}` : name,
    description: opts.description,
    alternates: canonical ? { canonical } : undefined,
    robots: noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title: opts.title ?? name, description: opts.description, siteName: name, locale: 'pt_PT', type: 'website',
      url: canonical, images: img ? [{ url: mediaKeyUrl(img.key).startsWith('http') ? mediaKeyUrl(img.key) : `${ctx.origin}${mediaKeyUrl(img.key)}`, width: img.width, height: img.height }] : undefined,
    },
    other: { 'format-detection': 'telephone=no' },
  };
}
