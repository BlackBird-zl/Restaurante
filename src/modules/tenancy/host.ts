/** Pure host helpers (used by proxy and server). */

export type NormalizedHost = { host: string; hostname: string; port: string };

/** Lowercases, converts IDN to punycode (via URL) and separates the port. Returns null if invalid. */
export function normalizeHost(raw: string | null | undefined): NormalizedHost | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (!value || value.length > 260 || /[\s/\\@?#]/.test(value)) return null;
  try {
    const u = new URL(`http://${value}`);
    const hostname = u.hostname.replace(/\.$/, '');
    if (!/^[a-z0-9.-]+$/.test(hostname)) return null;
    return { hostname, port: u.port, host: u.port ? `${hostname}:${u.port}` : hostname };
  } catch {
    return null;
  }
}

/** Public paths that belong to the central staff host and must 404 on tenant hosts. */
export const STAFF_ONLY_PREFIXES = ['/r/', '/entrar', '/recuperar', '/definir-palavra-passe', '/auth/', '/restaurantes', '/sair', '/api/v1/staff'];

export function isStaffPath(path: string): boolean {
  return STAFF_ONLY_PREFIXES.some((p) => path === p.replace(/\/$/, '') || path.startsWith(p));
}

export const TENANT_API_PREFIXES = ['/api/v1/guest', '/api/v1/public'];
export function isTenantApi(path: string): boolean {
  return TENANT_API_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/** Internal rewrite segment. Requests that *arrive* with it are rejected. */
export const INTERNAL_SEGMENT = '/internal-sites';

/** Context headers produced by the proxy; any value sent by the browser is stripped. */
export const CTX = {
  tenantId: 'x-ros-tenant-id',
  tenantSlug: 'x-ros-tenant-slug',
  tenantName: 'x-ros-tenant-name',
  basePath: 'x-ros-base-path',
  host: 'x-ros-host',
  origin: 'x-ros-origin',
  primaryOrigin: 'x-ros-primary-origin',
  isDemo: 'x-ros-demo',
  preview: 'x-ros-preview',
  nonce: 'x-nonce',
} as const;
