#!/usr/bin/env bash
set -euo pipefail
test "${CONFIRM_DEMO_SEED:-}" = yes||{ echo 'Set CONFIRM_DEMO_SEED=yes for synthetic records.';exit 2;};cd "$(dirname "$0")/..";set -a;source .env;set +a;: "${DATABASE_URL:?DATABASE_URL required}";psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/db/seed.sql

