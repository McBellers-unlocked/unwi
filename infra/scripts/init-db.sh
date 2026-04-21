#!/usr/bin/env bash
# Apply the UNWI schema to the deployed Aurora cluster.
#
# Run this ONCE after infra/deploy.sh reports CREATE_COMPLETE, and before the
# first /api/cron/snapshot call. Uses drizzle-kit push with --force, which
# diffs the Drizzle schema against the live DB and applies only the delta.
# Idempotent: safe to re-run on every schema bump.
#
# DATABASE_URL is pulled from the deployed Secrets Manager + CloudFormation
# output via env.sh; nothing is persisted.

set -euo pipefail

PROFILE="${AWS_PROFILE:-unwi}"
REGION="${AWS_REGION:-eu-west-1}"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DATABASE_URL=$(AWS_PROFILE="$PROFILE" AWS_REGION="$REGION" bash "$HERE/../env.sh" \
  | grep '^DATABASE_URL=' | cut -d'=' -f2-)
if [[ -z "$DATABASE_URL" ]]; then
  echo "error: could not derive DATABASE_URL — is the stack deployed?" >&2
  exit 1
fi

export DATABASE_URL
cd "$HERE/../.."

echo "Applying UNWI schema to Aurora..."
npx drizzle-kit push --force
echo "schema applied"
