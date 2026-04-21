#!/usr/bin/env bash
# Print Amplify-ready env vars from the deployed stack.
#
# Resolves Secrets Manager ARNs into actual values, assembles DATABASE_URL,
# and writes to stdout in KEY=VALUE form. Pipe to a file if you want to commit
# placeholders alongside your Amplify env-var form — NEVER commit the actual
# values; these are secrets.
#
# Usage:
#   ./infra/env.sh                # print to stdout
#   ./infra/env.sh > .env.aws     # save locally (gitignored)

set -euo pipefail

PROFILE="${AWS_PROFILE:-unwi}"
REGION="${AWS_REGION:-eu-west-1}"
STACK="${STACK_NAME:-unwi-infra}"

out() {
  aws cloudformation describe-stacks \
    --stack-name "$STACK" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" \
    --output text \
    --profile "$PROFILE" --region "$REGION"
}

POOL_ID=$(out CognitoUserPoolId)
CLIENT_ID=$(out CognitoClientId)
DOMAIN=$(out CognitoDomain)
R=$(out CognitoRegion)
DB_HOST=$(out DBClusterEndpoint)
DB_PORT=$(out DBClusterPort)
DB_NAME=$(out DBName)
DB_SECRET_ARN=$(out DBMasterSecretArn)
CRON_ARN=$(out CronSecretArn)

DB_JSON=$(aws secretsmanager get-secret-value \
  --secret-id "$DB_SECRET_ARN" \
  --query SecretString --output text \
  --profile "$PROFILE" --region "$REGION")
DB_USER=$(echo "$DB_JSON" | python -c "import sys,json;print(json.load(sys.stdin)['username'])")
DB_PASS=$(echo "$DB_JSON" | python -c "import sys,json;print(json.load(sys.stdin)['password'])")
# urlencode the password — CloudFormation ExcludeCharacters removes the
# worst offenders but `+` and `%` still need URL-escaping.
DB_PASS_URL=$(python -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1], safe=''))" "$DB_PASS")

CRON_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id "$CRON_ARN" \
  --query SecretString --output text \
  --profile "$PROFILE" --region "$REGION")

cat <<EOF
# --- Paste these into the Amplify app's Environment Variables ---
COGNITO_USER_POOL_ID=$POOL_ID
COGNITO_CLIENT_ID=$CLIENT_ID
COGNITO_REGION=$R
COGNITO_DOMAIN=$DOMAIN

DATABASE_URL=postgres://${DB_USER}:${DB_PASS_URL}@${DB_HOST}:${DB_PORT}/${DB_NAME}

CRON_SECRET=$CRON_SECRET

SUPABASE_JOBS_URL=https://sjtdudezqssbmratdgmy.supabase.co/functions/v1/jobs-api
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqdGR1ZGV6cXNzYm1yYXRkZ215Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMTY2MzMsImV4cCI6MjA3MTc5MjYzM30.4L6V9WQ1kmpH9ceHtGJkUQPSRue2LQxTINcFqz-rCTY

USD_PER_RECRUITMENT=20000
USD_TO_EUR_RATE=0.92
YTD_ANCHOR_DATE=2025-08-01
EOF
