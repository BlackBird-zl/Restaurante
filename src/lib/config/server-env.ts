import 'server-only';
import { z } from 'zod';

/**
 * Server configuration validated once at startup. Any missing/invalid value raises a
 * descriptive error listing the variables (see .env.example). Secrets never reach the client.
 */
const schema = z.object({
  APP_ENV: z.enum(['local', 'test', 'staging', 'production']).default('local'),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  APP_BASE_DOMAIN: z.string().min(1).regex(/^[a-z0-9.-]+$/),
  APP_STAFF_HOST: z.string().min(1),
  APP_PREVIEW_HOSTS: z.string().default(''),
  APP_URL_SCHEME: z.enum(['http', 'https']).default('https'),
  APP_PUBLIC_PORT: z.string().regex(/^\d*$/).default(''),
  GUEST_PIN_PEPPER: z.string().min(32),
  QR_ENCRYPTION_KEY: z.string().min(40),
  QR_ENCRYPTION_KEY_VERSION: z.coerce.number().int().min(1).default(1),
  QR_ENCRYPTION_KEY_PREVIOUS: z.string().optional(),
  QR_ENCRYPTION_KEY_PREVIOUS_VERSION: z.coerce.number().int().min(1).optional(),
  QR_CONTEXT_SECRET: z.string().min(32),
  RATE_LIMIT_SALT: z.string().min(32),
});

export type ServerEnv = z.infer<typeof schema> & { previewHosts: string[]; qrKeys: Record<number, string> };

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid server configuration. Check your environment (see .env.example):\n${issues}`);
  }
  const e = parsed.data;
  if (e.APP_ENV === 'production' && e.APP_URL_SCHEME !== 'https') {
    throw new Error('APP_URL_SCHEME must be https in production');
  }
  const qrKeys: Record<number, string> = { [e.QR_ENCRYPTION_KEY_VERSION]: e.QR_ENCRYPTION_KEY };
  if (e.QR_ENCRYPTION_KEY_PREVIOUS && e.QR_ENCRYPTION_KEY_PREVIOUS_VERSION) {
    qrKeys[e.QR_ENCRYPTION_KEY_PREVIOUS_VERSION] = e.QR_ENCRYPTION_KEY_PREVIOUS;
  }
  cached = {
    ...e,
    previewHosts: e.APP_ENV === 'production' ? [] : e.APP_PREVIEW_HOSTS.split(',').map((h) => h.trim().toLowerCase()).filter(Boolean),
    qrKeys,
  };
  return cached;
}

export function isSecureCookies(): boolean {
  return serverEnv().APP_URL_SCHEME === 'https';
}
