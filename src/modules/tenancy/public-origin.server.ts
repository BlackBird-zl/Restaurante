import 'server-only';
import { serverEnv } from '@/lib/config/server-env';

/** Origin of a tenant's public site (primary domain, or `{slug}.{base domain}` when none is verified). */
export function publicSiteOrigin(slug: string, primaryHost: string | null): string {
  const env = serverEnv();
  const host = primaryHost ?? `${slug}.${env.APP_BASE_DOMAIN}`;
  const port = env.APP_PUBLIC_PORT ? `:${env.APP_PUBLIC_PORT}` : '';
  return `${env.APP_URL_SCHEME}://${host}${port}`;
}
