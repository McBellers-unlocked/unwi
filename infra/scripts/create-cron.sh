#!/usr/bin/env bash
# Wire EventBridge Scheduler to POST /api/cron/snapshot nightly at 02:00 UTC.
#
# Deferred from the main CloudFormation stack because it needs the Amplify
# production URL, which only exists after the manual app-connection step.
#
# Usage:
#   ./infra/scripts/create-cron.sh https://your-app.amplifyapp.com
#
# Picks up CRON_SECRET from Secrets Manager automatically.

set -euo pipefail

APP_URL="${1:?usage: $0 https://<amplify-app-url> (no trailing slash)}"
APP_URL="${APP_URL%/}"

PROFILE="${AWS_PROFILE:-unwi}"
REGION="${AWS_REGION:-eu-west-1}"

CONNECTION_NAME="unwi-cron-connection"
DESTINATION_NAME="unwi-cron-destination"
SCHEDULE_NAME="unwi-nightly-snapshot"
ROLE_NAME="unwi-scheduler-role"
CRON_SECRET_ID="unwi/cron-secret"

echo "Reading cron secret from Secrets Manager..."
CRON_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id "$CRON_SECRET_ID" \
  --query SecretString --output text \
  --profile "$PROFILE" --region "$REGION")

# --- 1. Connection (API-key auth, header = x-cron-secret) ---------
echo "Creating/updating EventBridge connection..."
AUTH_JSON=$(python -c "
import json, sys
print(json.dumps({
    'ApiKeyAuthParameters': {
        'ApiKeyName': 'x-cron-secret',
        'ApiKeyValue': sys.argv[1],
    }
}))
" "$CRON_SECRET")

if aws events describe-connection --name "$CONNECTION_NAME" \
     --profile "$PROFILE" --region "$REGION" >/dev/null 2>&1; then
  aws events update-connection \
    --name "$CONNECTION_NAME" \
    --authorization-type API_KEY \
    --auth-parameters "$AUTH_JSON" \
    --profile "$PROFILE" --region "$REGION" >/dev/null
else
  aws events create-connection \
    --name "$CONNECTION_NAME" \
    --authorization-type API_KEY \
    --auth-parameters "$AUTH_JSON" \
    --profile "$PROFILE" --region "$REGION" >/dev/null
fi

# Wait for the connection to authorise
for _ in $(seq 1 30); do
  STATE=$(aws events describe-connection --name "$CONNECTION_NAME" \
    --query ConnectionState --output text \
    --profile "$PROFILE" --region "$REGION")
  [[ "$STATE" == "AUTHORIZED" ]] && break
  sleep 3
done

CONNECTION_ARN=$(aws events describe-connection --name "$CONNECTION_NAME" \
  --query ConnectionArn --output text \
  --profile "$PROFILE" --region "$REGION")
echo "  connection: $CONNECTION_ARN"

# --- 2. API destination -------------------------------------------
echo "Creating/updating API destination..."
if aws events describe-api-destination --name "$DESTINATION_NAME" \
     --profile "$PROFILE" --region "$REGION" >/dev/null 2>&1; then
  aws events update-api-destination \
    --name "$DESTINATION_NAME" \
    --connection-arn "$CONNECTION_ARN" \
    --invocation-endpoint "${APP_URL}/api/cron/snapshot" \
    --http-method POST \
    --profile "$PROFILE" --region "$REGION" >/dev/null
else
  aws events create-api-destination \
    --name "$DESTINATION_NAME" \
    --connection-arn "$CONNECTION_ARN" \
    --invocation-endpoint "${APP_URL}/api/cron/snapshot" \
    --http-method POST \
    --profile "$PROFILE" --region "$REGION" >/dev/null
fi
DESTINATION_ARN=$(aws events describe-api-destination --name "$DESTINATION_NAME" \
  --query ApiDestinationArn --output text \
  --profile "$PROFILE" --region "$REGION")
echo "  destination: $DESTINATION_ARN"

# --- 3. IAM role for Scheduler ------------------------------------
echo "Ensuring IAM role for Scheduler..."
TRUST_POLICY='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"scheduler.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

if ! aws iam get-role --role-name "$ROLE_NAME" --profile "$PROFILE" >/dev/null 2>&1; then
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "$TRUST_POLICY" \
    --profile "$PROFILE" >/dev/null
fi

INLINE_POLICY=$(python -c "
import json, sys
print(json.dumps({
    'Version': '2012-10-17',
    'Statement': [{
        'Effect': 'Allow',
        'Action': 'events:InvokeApiDestination',
        'Resource': sys.argv[1],
    }],
}))
" "$DESTINATION_ARN")

aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name invoke-api-destination \
  --policy-document "$INLINE_POLICY" \
  --profile "$PROFILE" >/dev/null

ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" \
  --query Role.Arn --output text --profile "$PROFILE")
echo "  role: $ROLE_ARN"

# --- 4. Schedule --------------------------------------------------
echo "Creating/updating Scheduler schedule..."
TARGET_JSON=$(python -c "
import json, sys
print(json.dumps({'Arn': sys.argv[1], 'RoleArn': sys.argv[2]}))
" "$DESTINATION_ARN" "$ROLE_ARN")

# Allow IAM role propagation (Scheduler validates PassRole on create).
sleep 10

if aws scheduler get-schedule --name "$SCHEDULE_NAME" \
     --profile "$PROFILE" --region "$REGION" >/dev/null 2>&1; then
  aws scheduler update-schedule \
    --name "$SCHEDULE_NAME" \
    --schedule-expression "cron(0 2 * * ? *)" \
    --schedule-expression-timezone "UTC" \
    --flexible-time-window '{"Mode":"OFF"}' \
    --target "$TARGET_JSON" \
    --profile "$PROFILE" --region "$REGION" >/dev/null
else
  aws scheduler create-schedule \
    --name "$SCHEDULE_NAME" \
    --schedule-expression "cron(0 2 * * ? *)" \
    --schedule-expression-timezone "UTC" \
    --flexible-time-window '{"Mode":"OFF"}' \
    --target "$TARGET_JSON" \
    --profile "$PROFILE" --region "$REGION" >/dev/null
fi

echo
echo "Cron wired."
echo "  Schedule: $SCHEDULE_NAME"
echo "  Cron:     02:00 UTC daily"
echo "  Target:   POST ${APP_URL}/api/cron/snapshot"
echo "  Auth:     header x-cron-secret from Secrets Manager ($CRON_SECRET_ID)"
echo
echo "To test immediately (without waiting for 02:00 UTC):"
echo "  curl -X POST '${APP_URL}/api/cron/snapshot' \\"
echo "    -H \"x-cron-secret: \$(aws secretsmanager get-secret-value --secret-id $CRON_SECRET_ID --query SecretString --output text --profile $PROFILE --region $REGION)\""
