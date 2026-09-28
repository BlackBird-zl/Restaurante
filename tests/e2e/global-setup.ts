import { execSync } from 'node:child_process';

export default function globalSetup() {
  if (process.env.QA_SKIP_RESET === '1') return;
  execSync('pnpm -s reset:demo --confirm=reset-demo', { stdio: 'inherit' });
}
