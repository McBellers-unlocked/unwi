#!/usr/bin/env bash
# Build the classifier Lambda container image and push it to ECR.
#
# Run order on first deploy:
#   1. infra/deploy.sh                    (creates ECR repo, no Lambda yet)
#   2. infra/scripts/build-and-push-classifier.sh  (this script)
#   3. infra/deploy.sh with CLASSIFIER_IMAGE_URI=<tag-or-digest>
#                                         (creates the Lambda + EventBridge rule)
#
# Subsequent updates: just re-run this script, then
#   infra/scripts/rotate-classifier-image.sh to point Lambda at the new tag.

set -euo pipefail

PROFILE="${AWS_PROFILE:-unwi}"
REGION="${AWS_REGION:-eu-west-1}"
STACK="${STACK_NAME:-unwi-infra}"
TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"

echo "Fetching ECR repo URI from stack $STACK..."
REPO_URI=$(aws cloudformation describe-stacks \
  --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='ClassifierRepoUri'].OutputValue" \
  --output text \
  --profile "$PROFILE" --region "$REGION")

if [[ -z "$REPO_URI" || "$REPO_URI" == "None" ]]; then
  echo "error: ClassifierRepoUri output missing. Did you run infra/deploy.sh first?" >&2
  exit 1
fi

echo "  repo: $REPO_URI"
echo "  tag:  $TAG"

aws ecr get-login-password --region "$REGION" --profile "$PROFILE" \
  | docker login --username AWS --password-stdin "$REPO_URI"

docker build \
  --platform linux/amd64 \
  --provenance=false \
  -t "$REPO_URI:$TAG" \
  -t "$REPO_URI:latest" \
  "$ROOT/classifier-service"

docker push "$REPO_URI:$TAG"
docker push "$REPO_URI:latest"

echo
echo "Pushed:"
echo "  $REPO_URI:$TAG"
echo "  $REPO_URI:latest"
echo
echo "Next:"
echo "  CLASSIFIER_IMAGE_URI=\"$REPO_URI:$TAG\" infra/deploy.sh"
echo "to create the Lambda on first run, or"
echo "  infra/scripts/rotate-classifier-image.sh \"$REPO_URI:$TAG\""
echo "to roll a fresh image into an existing Lambda."
