import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import AlphabeticalSequencer from './tests/support/sequencer';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const alias = { '@': r('./src'), '@fixtures': r('./fixtures'), 'server-only': r('./tests/support/empty.ts') };

export default defineConfig({
  test: {
    sequence: { sequencer: AlphabeticalSequencer },
    projects: [
      { resolve: { alias }, test: { name: 'unit', include: ['tests/unit/**/*.test.ts'], environment: 'node' } },
      {
        resolve: { alias },
        test: {
          name: 'integration', include: ['tests/integration/**/*.test.ts'], environment: 'node',
          // Talks to the running app + local stack; sequential to keep rate limits and shared demo state predictable.
          fileParallelism: false, globalSetup: ['tests/integration/global-setup.ts'], testTimeout: 60_000, hookTimeout: 120_000,
        },
      },
    ],
  },
});
