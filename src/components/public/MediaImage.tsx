import type { CSSProperties } from 'react';
import type { MediaDTO } from '@/modules/menu/types';
import { isPlaceholder, mediaKeyUrl, pickVariants } from '@/modules/media/url';

type Use = 'hero' | 'heroMobile' | 'card' | 'detail' | 'thumb';

/**
 * Responsive image with reserved dimensions (no CLS), focal point and lazy loading.
 * Placeholders (pending photography) are rendered as what they are: labelled internal slots.
 */
export function MediaImage({ media, use = 'detail', sizes = '100vw', priority = false, className, alt, fit = 'cover', ratio }: {
  media: MediaDTO | null | undefined; use?: Use; sizes?: string; priority?: boolean; className?: string; alt?: string;
  fit?: 'cover' | 'contain'; ratio?: string;
}) {
  if (!media) return null;
  const variants = pickVariants(media, use);
  const fallback = variants.find((v) => v.mime === 'image/jpeg') ?? variants[0];
  if (!fallback) return null;
  const webp = variants.filter((v) => v.mime === 'image/webp');
  const avif = variants.filter((v) => v.mime === 'image/avif');
  const srcSet = (vs: typeof variants) => vs.map((v) => `${mediaKeyUrl(v.key)} ${v.width}w`).join(', ');
  const placeholder = isPlaceholder(media);
  const style: CSSProperties = {
    objectFit: fit, objectPosition: `${Number(media.focalX) * 100}% ${Number(media.focalY) * 100}%`,
    aspectRatio: ratio, width: '100%', height: ratio ? 'auto' : '100%',
  };
  // alt="" marks the image as decorative (e.g. a thumbnail inside a link already named by the product).
  const text = alt === '' ? '' : placeholder ? `Fotografia pendente (placeholder interno): ${alt ?? media.alt}` : (alt ?? media.alt);
  const pic = (
    <picture className={className} data-placeholder={placeholder ? 'true' : undefined}>
      {avif.length ? <source type="image/avif" srcSet={srcSet(avif)} sizes={sizes} /> : null}
      {webp.length ? <source type="image/webp" srcSet={srcSet(webp)} sizes={sizes} /> : null}
      <img
        src={mediaKeyUrl(fallback.key)}
        srcSet={variants.filter((v) => v.mime === fallback.mime).length > 1 ? srcSet(variants.filter((v) => v.mime === fallback.mime)) : undefined}
        sizes={sizes}
        width={fallback.width}
        height={fallback.height}
        alt={text}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        style={style}
      />
    </picture>
  );
  if (!placeholder) return pic;
  const slot = media.key.split('/').pop()?.replace(/^(\d+)-/, '$1 · ').replace(/-/g, ' ') ?? '';
  return (
    <span style={{ position: 'relative', display: 'block', width: '100%', height: '100%' }}>
      {pic}
      <span aria-hidden style={{ position: 'absolute', left: use === 'thumb' ? 4 : 10, bottom: use === 'thumb' ? 4 : 10, maxWidth: 'calc(100% - 8px)', zIndex: 2, background: 'rgba(244, 240, 231, 0.88)', padding: use === 'thumb' ? '1px 3px' : '3px 6px', fontFamily: 'var(--font-sans)', fontSize: use === 'thumb' ? 8 : 10.5,
        letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3c3a33', lineHeight: 1.35 }}>
        {use === 'thumb' ? 'Foto pendente' : <>Fotografia pendente · placeholder<br /><span style={{ letterSpacing: '0.04em' }}>{slot}</span></>}
      </span>
    </span>
  );
}
