#!/usr/bin/env bash
# pgTAP suite (grants/RLS/EXECUTE, isolation, transactions, analytics).
# Runs against the local database; every file is wrapped in BEGIN/ROLLBACK.
# With the Supabase CLI you can also run: supabase test db
# Precondition: migrations applied and a fresh demo seed (pnpm reset:demo --confirm=reset-demo --t0=2026-09-27T13:00:00Z).
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -f .env.local ]; then set -a; . ./.env.local; set +a; fi
DB_URL="${SUPABASE_DB_URL:-postgresql://postgres@127.0.0.1:54322/postgres}"
psql "$DB_URL" -q -c "create extension if not exists pgtap with schema extensions" >/dev/null
cd supabase/tests
pg_prove --dbname "$DB_URL" --ext .sql ${PG_PROVE_ARGS:-} ./*.sql
