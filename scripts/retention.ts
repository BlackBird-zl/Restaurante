/**
 * Daily retention job (Arquitetura §13): expired idempotency keys and rate-limit buckets, invalidations > 24 h,
 * guest session secrets 7 days after expiry, reservation personal data 90 days after the date.
 * Schedule once a day (e.g. Vercel Cron → protected route, pg_cron, or a CI schedule running `pnpm retention:run`).
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnv, requireEnv } from './lib/env';

loadEnv();
const client = createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});
client.rpc('system_run_retention', {}).then(({ data, error }) => {
  if (error) { console.error(`retention failed: ${error.message}`); process.exit(1); }
  console.log(JSON.stringify(data));
});
