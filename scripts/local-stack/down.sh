#!/usr/bin/env bash
set -uo pipefail
LS="${LOCAL_STACK_DIR:-/opt/localstack}"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
for n in gateway storage postgrest auth mailpit; do
  if [ -f "$LS/run/$n.pid" ]; then kill "$(cat "$LS/run/$n.pid")" 2>/dev/null; rm -f "$LS/run/$n.pid"; fi
done
pkill -f "tsx src/start/server.ts" 2>/dev/null
if [ "$(id -u)" = "0" ]; then su postgres -c "$PGBIN/pg_ctl -D $LS/pgdata stop -m fast" >/dev/null 2>&1; else "$PGBIN/pg_ctl" -D "$LS/pgdata" stop -m fast >/dev/null 2>&1; fi
echo "local stack stopped"
