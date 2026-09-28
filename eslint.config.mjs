import next from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...next,
  ...nextTs,
  {
    ignores: ['.next/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'next-env.d.ts'],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['**/supabase/privileged*'], message: 'Privileged client is server-only; import it only from *.server.ts modules or route handlers.' }],
      }],
    },
  },
  {
    files: ['src/app/api/**', 'src/**/*.server.ts', 'scripts/**', 'tests/**'],
    rules: { 'no-restricted-imports': 'off' },
  },
];

export default config;
