#!/usr/bin/env bash
# Trigger a fresh snapshot by invoking the classifier Lambda synchronously.
# Use this after a classifier update or when you want an off-cycle snapshot.

set -euo pipefail

PROFILE="${AWS_PROFILE:-unwi}"
REGION="${AWS_REGION:-eu-west-1}"
STACK="${STACK_NAME:-unwi-infra}"

FN=$(aws cloudformation describe-stacks \
  --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='ClassifierLambdaName'].OutputValue" \
  --output text \
  --profile "$PROFILE" --region "$REGION")

if [[ -z "$FN" || "$FN" == "None" || "$FN" == "not-yet-deployed" ]]; then
  echo "error: classifier Lambda not deployed yet. Run build-and-push-classifier.sh then re-deploy with CLASSIFIER_IMAGE_URI set." >&2
  exit 1
fi

OUT=$(mktemp)
echo "Invoking $FN (sync, ≤10 min timeout)..."
aws lambda invoke \
  --function-name "$FN" \
  --invocation-type RequestResponse \
  --payload '{}' \
  --cli-binary-format raw-in-base64-out \
  --profile "$PROFILE" --region "$REGION" \
  "$OUT" >/dev/null

echo
echo "Lambda result:"
cat "$OUT"
echo
rm -f "$OUT"
