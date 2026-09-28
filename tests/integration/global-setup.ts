import { execSync } from 'node:child_process';

/** Integration tests run against the live local app + stack; start from a freshly seeded demo. */
export default function setup() {
  if (process.env.QA_SKIP_RESET === '1') return;
  execSync('pnpm -s reset:demo --confirm=reset-demo', { stdio: 'inherit' });
}
