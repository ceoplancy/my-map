#!/usr/bin/env bash
# Apply Supabase migrations using DATABASE_URL (PostgreSQL connection string).
# Usage: DATABASE_URL="postgresql://..." pnpm db:push

set -e
cd "$(dirname "$0")/.."

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set."
  echo "Example: export DATABASE_URL=\"postgresql://postgres:YOUR_PASSWORD@db.xavgmoavznyppbsfqiis.supabase.co:5432/postgres\""
  exit 1
fi

echo "Applying 20250314000000_platform_schema.sql..."
psql "$DATABASE_URL" -f supabase/migrations/20250314000000_platform_schema.sql

echo "Applying 20250314000001_rls.sql..."
psql "$DATABASE_URL" -f supabase/migrations/20250314000001_rls.sql

echo "Done. Run 'pnpm typegen' to refresh src/types/db.ts if needed."
