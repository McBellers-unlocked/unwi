#!/usr/bin/env bash
# UNWI — CloudFormation deploy.
#
# Creates / updates the durable infrastructure stack. Idempotent; safe to re-run.
# Auto-discovers the default VPC and at least 2 default subnets.
#
# Prerequisites:
#   - AWS CLI configured with profile `unwi` (see top-level README)
#   - Permissions: RDS, Cognito, Secrets Manager, EC2 read, IAM, CloudFormation
#
# Usage:
#   ./infra/deploy.sh              # deploy / update
#   ADMIN_EMAIL=me@x.org ./infra/deploy.sh   # also pre-create a Cognito admin user

set -euo pipefail

PROFILE="${AWS_PROFILE:-unwi}"
REGION="${AWS_REGION:-eu-west-1}"
STACK="${STACK_NAME:-unwi-infra}"
COGNITO_PREFIX="${COGNITO_DOMAIN_PREFIX:-unwi-auth}"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$HERE/template.yaml"

echo "Deploying $STACK to $REGION via profile $PROFILE..."

# --- Auto-discover default VPC + subnets ----------------------------
VPC_ID=$(aws ec2 describe-vpcs \
  --filters Name=is-default,Values=true \
  --query 'Vpcs[0].VpcId' --output text \
  --profile "$PROFILE" --region "$REGION")

if [[ "$VPC_ID" == "None" || -z "$VPC_ID" ]]; then
  echo "error: no default VPC in $REGION. Either create one (aws ec2 create-default-vpc) or set VPC_ID manually." >&2
  exit 1
fi

SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=default-for-az,Values=true" \
  --query 'Subnets[].SubnetId' --output text \
  --profile "$PROFILE" --region "$REGION" | tr '\t' ',')

SUBNET_COUNT=$(echo "$SUBNET_IDS" | tr ',' '\n' | wc -l)
if [[ "$SUBNET_COUNT" -lt 2 ]]; then
  echo "error: Aurora DB subnet group needs >=2 subnets in different AZs; found $SUBNET_COUNT" >&2
  exit 1
fi

echo "  VPC:     $VPC_ID"
echo "  Subnets: $SUBNET_IDS ($SUBNET_COUNT AZs)"

# --- Deploy ---------------------------------------------------------
PARAMS=(
  "ProjectName=unwi"
  "VpcId=$VPC_ID"
  "SubnetIds=$SUBNET_IDS"
  "CognitoDomainPrefix=$COGNITO_PREFIX"
)
if [[ -n "${ADMIN_EMAIL:-}" ]]; then
  PARAMS+=("AdminEmail=$ADMIN_EMAIL")
fi

aws cloudformation deploy \
  --stack-name "$STACK" \
  --template-file "$TEMPLATE" \
  --parameter-overrides "${PARAMS[@]}" \
  --capabilities CAPABILITY_IAM \
  --profile "$PROFILE" \
  --region "$REGION"

echo
echo "Stack outputs:"
aws cloudformation describe-stacks \
  --stack-name "$STACK" \
  --query 'Stacks[0].Outputs[].[OutputKey,OutputValue]' \
  --output table \
  --profile "$PROFILE" --region "$REGION"

echo
echo "Run ./infra/env.sh to print Amplify-ready env vars."
