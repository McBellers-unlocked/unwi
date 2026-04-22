#!/usr/bin/env bash
# Point the existing classifier Lambda at a new image tag.
# Single-command redeploy after classifier_v2.py updates.
#
# Usage:
#   infra/scripts/rotate-classifier-image.sh <image-uri>
# or with no arg, uses <repo>:latest.

set -euo pipefail

PROFILE="${AWS_PROFILE:-unwi}"
REGION="${AWS_REGION:-eu-west-1}"
STACK="${STACK_NAME:-unwi-infra}"

FN=$(aws cloudformation describe-stacks \
  --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='ClassifierLambdaName'].OutputValue" \
  --output text \
  --profile "$PROFILE" --region "$REGION")
REPO=$(aws cloudformation describe-stacks \
  --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='ClassifierRepoUri'].OutputValue" \
  --output text \
  --profile "$PROFILE" --region "$REGION")

if [[ -z "$FN" || "$FN" == "not-yet-deployed" ]]; then
  echo "error: Lambda not deployed. First run deploy.sh with CLASSIFIER_IMAGE_URI set." >&2
  exit 1
fi

IMAGE="${1:-$REPO:latest}"

aws lambda update-function-code \
  --function-name "$FN" \
  --image-uri "$IMAGE" \
  --profile "$PROFILE" --region "$REGION" >/dev/null

aws lambda wait function-updated \
  --function-name "$FN" \
  --profile "$PROFILE" --region "$REGION"

echo "Rotated $FN to $IMAGE"
