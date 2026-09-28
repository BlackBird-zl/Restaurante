/**
 * pnpm seed:demo [--t0=2026-09-27T13:00:00Z]
 * Idempotent demo seed. Refuses to run with APP_ENV=production.
 * Writes local credentials to .demo-credentials.local.json (gitignored).
 */
import { writeFileSync } from 'node:fs';
import { assertNotProduction, loadEnv } from './lib/env';
import { runSeed } from './lib/seed';

loadEnv();
assertNotProduction('seed:demo');
const arg = process.argv.find((a) => a.startsWith('--t0='));
const t0 = arg ? new Date(arg.slice(5)) : new Date();
if (Number.isNaN(t0.getTime())) throw new Error('Invalid --t0');

runSeed({ t0 })
  .then((r) => {
    writeFileSync('.demo-credentials.local.json', JSON.stringify({ t0: r.t0, users: r.users }, null, 2) + '\n');
    console.log('credentials written to .demo-credentials.local.json (local only, gitignored)');
  })
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
