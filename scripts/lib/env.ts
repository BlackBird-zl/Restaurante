import { existsSync } from 'node:fs';

/** Loads .env.local then .env (without overriding already-set variables). */
export function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    if (existsSync(f)) {
      try { process.loadEnvFile(f); } catch { /* ignore */ }
    }
  }
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name} (see .env.example)`);
  return v;
}

export function assertNotProduction(action: string) {
  const env = process.env.APP_ENV ?? 'local';
  if (env === 'production') throw new Error(`${action} refused: APP_ENV=production`);
}
