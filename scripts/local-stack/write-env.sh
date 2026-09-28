#!/usr/bin/env bash
# Writes .env.local for the LOCAL stack (never for staging/production). Refuses to overwrite.
# Keys: local-only anon/service JWTs signed with the local stack secret; other secrets are random.
set -euo pipefail
cd "$(dirname "$0")/../.."
if [ -f .env.local ]; then echo ".env.local already exists — not overwritten"; exit 0; fi
k() { openssl rand -base64 32; }
ANON=${ANON_KEY:-$(node scripts/local-stack/keys.mjs anon)}
SERVICE=${SERVICE_ROLE_KEY:-$(node scripts/local-stack/keys.mjs service)}
umask 077
cat > .env.local <<ENV
APP_ENV=local
NEXT_PUBLIC_SUPABASE_URL=${API_URL:-http://127.0.0.1:54321}
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$ANON
SUPABASE_SERVICE_ROLE_KEY=$SERVICE
SUPABASE_DB_URL=${DB_URL:-postgresql://postgres@127.0.0.1:54322/postgres}
APP_BASE_DOMAIN=localhost
APP_STAFF_HOST=localhost:3000
APP_PREVIEW_HOSTS=localhost:3000,127.0.0.1:3000
APP_URL_SCHEME=http
APP_PUBLIC_PORT=3000
GUEST_PIN_PEPPER=$(k)
QR_ENCRYPTION_KEY=$(k)
QR_ENCRYPTION_KEY_VERSION=1
QR_CONTEXT_SECRET=$(k)
RATE_LIMIT_SALT=$(k)
DEMO_SEED_PASSWORD=Demo-$(openssl rand -hex 4)
ENV
echo ".env.local written (local only; gitignored)"
