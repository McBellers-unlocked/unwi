#!/usr/bin/env bash
# Tear down the UNWI CloudFormation stack.
#
# The DBCluster has DeletionPolicy=Snapshot so the Aurora cluster leaves a
# final snapshot behind that you have to delete manually if you want the
# storage bill to go to zero. The Cognito user pool is deleted outright; any
# users that exist are lost.

set -euo pipefail

PROFILE="${AWS_PROFILE:-unwi}"
REGION="${AWS_REGION:-eu-west-1}"
STACK="${STACK_NAME:-unwi-infra}"

echo "Deleting stack $STACK in $REGION (profile $PROFILE)..."
echo "Aurora final snapshot will be retained — remove manually if you want zero DB spend."

aws cloudformation delete-stack \
  --stack-name "$STACK" \
  --profile "$PROFILE" --region "$REGION"

aws cloudformation wait stack-delete-complete \
  --stack-name "$STACK" \
  --profile "$PROFILE" --region "$REGION"

echo "Stack deleted."
