/**
 * Builds public URLs of a tenant. Never concatenate `/d/{slug}` by hand in the UI.
 * `basePath` is '' on the tenant's own host and '/d/{slug}' in local/preview mode.
 */
export function publicUrl(basePath: string, path = '/'): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!basePath) return p;
  return p === '/' ? basePath : `${basePath}${p}`;
}

export function absolutePublicUrl(origin: string, basePath: string, path = '/'): string {
  return `${origin}${publicUrl(basePath, path)}`;
}

export const CTA_TARGETS: Record<string, string> = {
  carta: '/carta',
  reservas: '/reservas',
  ambiente: '/ambiente',
  sobre: '/sobre',
  contactos: '/contactos',
};
