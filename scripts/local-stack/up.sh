#!/usr/bin/env bash
# Starts the no-Docker local stack: PostgreSQL 16 (+pgTAP), Supabase Auth (GoTrue),
# PostgREST, Mailpit and a Kong-like gateway on :54321. Use this only when
# `supabase start` (Docker) is unavailable. See README "Stack local sem Docker".
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LS="${LOCAL_STACK_DIR:-/opt/localstack}"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
RUN="$LS/run"
mkdir -p "$RUN"
export LOCAL_JWT_SECRET="${LOCAL_JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters-long}"
PGURL="postgresql://postgres@127.0.0.1:54322/postgres"

as_pg() { if [ "$(id -u)" = "0" ]; then su postgres -c "$*"; else bash -c "$*"; fi; }

if [ ! -d "$LS/pgdata" ]; then
  mkdir -p "$LS/pgdata"; [ "$(id -u)" = "0" ] && chown postgres "$LS" "$LS/pgdata"
  as_pg "$PGBIN/initdb -D $LS/pgdata -U postgres --auth=trust -E UTF8 --locale=C.UTF-8" >/dev/null
fi
if ! as_pg "$PGBIN/pg_ctl -D $LS/pgdata status" >/dev/null 2>&1; then
  as_pg "$PGBIN/pg_ctl -D $LS/pgdata -o \"-p 54322 -c listen_addresses=127.0.0.1 -c wal_level=logical -c max_connections=200 -c timezone=UTC\" -l $LS/pg.log start -w" >/dev/null
fi
psql "$PGURL" -q -v ON_ERROR_STOP=1 -f "$ROOT/scripts/local-stack/bootstrap.sql" >/dev/null
echo "postgres  :54322 ok"

start_bg() { # name, cwd, cmd...
  local name="$1" cwd="$2"; shift 2
  if [ -f "$RUN/$name.pid" ] && kill -0 "$(cat "$RUN/$name.pid")" 2>/dev/null; then return; fi
  (cd "$cwd" && nohup setsid "$@" </dev/null >"$RUN/$name.log" 2>&1 & echo $! >"$RUN/$name.pid")
}

start_bg mailpit "$LS" "$LS/mailpit" --smtp 127.0.0.1:54325 --listen 127.0.0.1:54324 --smtp-auth-accept-any --smtp-auth-allow-insecure

export GOTRUE_API_HOST=127.0.0.1 PORT=9999 API_EXTERNAL_URL="http://127.0.0.1:54321/auth/v1"
export GOTRUE_DB_DRIVER=postgres DB_NAMESPACE=auth
export GOTRUE_DB_DATABASE_URL="postgres://supabase_auth_admin:postgres@127.0.0.1:54322/postgres"
export GOTRUE_SITE_URL="${APP_PUBLIC_URL:-http://localhost:3000}"
export GOTRUE_URI_ALLOW_LIST="http://localhost:3000/**,http://127.0.0.1:3000/**"
export GOTRUE_DISABLE_SIGNUP=true GOTRUE_JWT_SECRET="$LOCAL_JWT_SECRET" GOTRUE_JWT_EXP=3600
export GOTRUE_JWT_AUD=authenticated GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated GOTRUE_JWT_ADMIN_ROLES=service_role
export GOTRUE_EXTERNAL_EMAIL_ENABLED=true GOTRUE_MAILER_AUTOCONFIRM=false
export GOTRUE_SMTP_HOST=127.0.0.1 GOTRUE_SMTP_PORT=54325 GOTRUE_SMTP_ADMIN_EMAIL="no-reply@restaurant-os.local" GOTRUE_SMTP_SENDER_NAME="restaurant-os (local)"
export GOTRUE_RATE_LIMIT_EMAIL_SENT=1000 GOTRUE_MAILER_OTP_EXP=3600 GOTRUE_LOG_LEVEL=warn
if [ ! -f "$RUN/auth.migrated" ]; then (cd "$LS/auth" && ./auth migrate >"$RUN/auth-migrate.log" 2>&1) && touch "$RUN/auth.migrated"; fi
start_bg auth "$LS/auth" "$LS/auth/auth" serve

export PGRST_DB_URI="postgres://authenticator:postgres@127.0.0.1:54322/postgres"
export PGRST_DB_SCHEMAS=public PGRST_DB_ANON_ROLE=anon PGRST_JWT_SECRET="$LOCAL_JWT_SECRET"
export PGRST_SERVER_PORT=54331 PGRST_SERVER_HOST=127.0.0.1 PGRST_DB_CHANNEL_ENABLED=true PGRST_DB_POOL=40
start_bg postgrest "$LS" "$LS/postgrest"


# Optional: Supabase Storage API (file backend) from a source checkout in $LS/storage-src
# (git clone https://github.com/supabase/storage; npm install --force; npm rebuild fs-xattr --nodedir=<node prefix>).
ANON_KEY="$(node "$ROOT/scripts/local-stack/keys.mjs" anon)"; SERVICE_KEY="$(node "$ROOT/scripts/local-stack/keys.mjs" service)"
if [ -d "$LS/storage-src/node_modules" ]; then
  mkdir -p "$LS/storage-data"
  ( export SERVER_HOST=127.0.0.1 SERVER_PORT=54335 SERVER_ADMIN_PORT=54336 SERVER_REGION=local \
      AUTH_JWT_SECRET="$LOCAL_JWT_SECRET" AUTH_JWT_ALGORITHM=HS256 ANON_KEY SERVICE_KEY TENANT_ID=stub \
      DATABASE_URL="postgresql://supabase_storage_admin:postgres@127.0.0.1:54322/postgres" DB_INSTALL_ROLES=false \
      DB_MIGRATIONS_STRATEGY=on_request DB_SUPER_USER=postgres FILE_SIZE_LIMIT=52428800 UPLOAD_FILE_SIZE_LIMIT=52428800 \
      STORAGE_BACKEND=file STORAGE_FILE_BACKEND_PATH="$LS/storage-data" GLOBAL_S3_BUCKET=stub IMAGE_TRANSFORMATION_ENABLED=false \
      RATE_LIMITER_ENABLED=false PG_QUEUE_ENABLE=false LOG_LEVEL=warn OTEL_METRICS_ENABLED=false PROMETHEUS_METRICS_ENABLED=false LOGFLARE_ENABLED=false
    start_bg storage "$LS/storage-src" npx tsx src/start/server.ts )
  STORAGE=1
fi

start_bg gateway "$ROOT" node "$ROOT/scripts/local-stack/gateway.mjs"

for i in $(seq 1 40); do
  if curl -fsS http://127.0.0.1:54321/auth/v1/health >/dev/null 2>&1 && curl -fsS http://127.0.0.1:54331/ >/dev/null 2>&1; then break; fi
  sleep 0.5
done
curl -fsS http://127.0.0.1:54321/auth/v1/health >/dev/null && echo "auth      :54321/auth/v1 ok"
curl -fsS http://127.0.0.1:54331/ >/dev/null && echo "postgrest :54321/rest/v1 ok"
echo "mailpit   http://127.0.0.1:54324"
if [ "${STORAGE:-0}" = "1" ]; then
  for i in $(seq 1 60); do curl -fsS http://127.0.0.1:54335/status >/dev/null 2>&1 && break; sleep 0.5; done
  for b in "restaurant-media-public true" "restaurant-media-private false"; do
    set -- $b
    curl -s -o /dev/null -X POST http://127.0.0.1:54321/storage/v1/bucket -H "Authorization: Bearer $SERVICE_KEY" -H "apikey: $SERVICE_KEY" \
      -H 'content-type: application/json' -d "{\"id\":\"$1\",\"name\":\"$1\",\"public\":$2,\"file_size_limit\":10485760,\"allowed_mime_types\":[\"image/webp\",\"image/jpeg\",\"image/png\",\"image/avif\"]}"
  done
  echo "storage   :54321/storage/v1 ok (file backend)"
else
  echo "storage   not installed (uploads return 503; see README)"
fi
echo "anon key:    $(node "$ROOT/scripts/local-stack/keys.mjs" anon)"
