# UNWI — AWS infrastructure

CloudFormation-managed durable resources for UN Workforce Intelligence.

```
infra/
  template.yaml                     All durable AWS resources
  deploy.sh                         Create / update the stack (idempotent)
  env.sh                            Print Amplify-ready env vars
  destroy.sh                        Tear down (Aurora final snapshot retained)
  scripts/
    init-db.sh                      drizzle-kit push → Aurora
    build-and-push-classifier.sh    Docker build + ECR push
    rotate-classifier-image.sh      Update-function-code to a new image
    invoke-classifier-manual.sh     One-shot synchronous classifier run
```

## What's in the stack

- **Cognito** user pool + hosted-UI domain + app client (callback URLs for
  `localhost:3000`, `localhost:3003`, and `unworkforceintelligence.org`).
- **Aurora Serverless v2** Postgres 16.6 (0.5–2 ACU by default, 7-day backups,
  snapshot-on-delete). Publicly accessible for Amplify SSR; SG split below.
- **Secrets Manager** — DB master credentials + legacy `x-cron-secret` (kept
  for rollback; no longer consumed).
- **S3 bucket** — `unwi-snapshots-<account>`, versioned, private. Holds the
  12 classifier artefacts per run + a `latest/` pointer.
- **ECR repo** — `unwi-classifier` for the Python Lambda container image.
- **Lambda** — `unwi-classifier`, container image, 2 GB / 10 min, VPC-attached
  to the same subnets as Aurora. Created on the second deploy (after image is
  pushed).
- **IAM role** — S3 write + Secrets Manager read + VPC access. Provisioned
  with the Lambda (conditional on `ClassifierImageUri`).
- **EventBridge rule** — `unwi-classifier-nightly` at `cron(0 2 * * ? *)`,
  target Lambda. Replaces the old API-destination rule.
- **SG split** — `ClassifierLambdaSG` (egress only) and `DBSecurityGroup`
  with three ingress rules:
  - `SourceSecurityGroupId`: ClassifierLambdaSG
  - `CidrIp`: `DevIpCidr` param (narrow to `/32` in prod)
  - `CidrIp`: `AmplifyCidr` param (default `0.0.0.0/0` — tighten when Amplify
    moves into the VPC)

**Not in the stack** (deliberate):

- Amplify hosting app — requires GitHub OAuth, created manually in the
  console.
- Route 53 / ACM — DNS lives at Cloudflare. Amplify issues its own ACM cert
  when the custom domain is added.

## Deploy

### First time

```bash
export AWS_PROFILE=unwi
AWS_REGION=eu-west-1 \
DEV_IP_CIDR="203.0.113.42/32" \
ADMIN_EMAIL=you@example.org \
./infra/deploy.sh
```

First run ~15 min (Aurora cluster creation). On this first pass,
`ClassifierImageUri` is empty, so only the ECR repo is created (the Lambda +
EventBridge rule are conditional and skipped).

### Push the classifier image

```bash
./infra/scripts/build-and-push-classifier.sh
```

Prints a git-SHA tag. Use it in the next step.

### Re-deploy to create the Lambda

```bash
CLASSIFIER_IMAGE_URI="<tag-from-previous-step>" \
DEV_IP_CIDR="203.0.113.42/32" \
./infra/deploy.sh
```

This pass creates `ClassifierLambda`, `ClassifierLambdaRole`,
`ClassifierNightly` rule, and the invoke permission.

### Apply the schema

```bash
./infra/scripts/init-db.sh
```

## Classifier updates

```bash
./infra/scripts/build-and-push-classifier.sh
./infra/scripts/rotate-classifier-image.sh
./infra/scripts/invoke-classifier-manual.sh
```

Three-command redeploy. `rotate-classifier-image.sh` uses
`update-function-code --image-uri` which is non-destructive — if the new
image has a bug, re-running with an old tag reverts.

## Inspecting snapshot runs

```
SELECT id, started_at, finished_at, status, rows_fetched,
       rows_classified, s3_key_prefix, error_message
  FROM snapshot_runs
 ORDER BY started_at DESC
 LIMIT 20;
```

Lambda writes one row per invocation; status transitions `running` →
`success` / `failed` with an error message on rollback.

## DB user setup

Migration `0002_v2_pivot.sql` creates two least-privilege roles without
passwords:

- `unwi_writer` — SELECT/INSERT/UPDATE/DELETE on all snapshot tables.
  Used by the classifier Lambda.
- `unwi_reader` — SELECT only, on current and future tables in `public`.
  Used by the Amplify SSR Next.js reader.

Operators MUST set passwords after the migration runs. Generate random
passwords and store them in Secrets Manager (`unwi/aurora/writer`,
`unwi/aurora/reader`), then apply:

```bash
WRITER_PW=$(openssl rand -base64 32 | tr -d '=')
READER_PW=$(openssl rand -base64 32 | tr -d '=')

aws secretsmanager create-secret --name unwi/aurora/writer --secret-string "$WRITER_PW" \
  --profile unwi --region eu-west-1
aws secretsmanager create-secret --name unwi/aurora/reader --secret-string "$READER_PW" \
  --profile unwi --region eu-west-1

psql "$AURORA_ADMIN_DSN" <<SQL
ALTER ROLE unwi_writer PASSWORD '$WRITER_PW';
ALTER ROLE unwi_reader PASSWORD '$READER_PW';
SQL
```

Then point the classifier Lambda at `unwi/aurora/writer` (set `DB_SECRET_ARN`
in the stack) and Amplify SSR at `unwi/aurora/reader` (set `DATABASE_URL`
using the reader credentials).

The master-user credentials stay in `unwi/aurora/master` for migrations /
emergency access only; neither runtime should use them day-to-day.

## KNOWN: Amplify-to-Aurora ingress is 0.0.0.0/0

`AmplifyCidr` defaults to `0.0.0.0/0` because Amplify Gen 1 SSR has no stable
egress IP range. This is intentionally documented so reviewers don't mistake
it for a miss: tightening requires migrating to **Amplify Gen 2** with the
VPC connector. Target: within 2 weeks of the first pitch. Once Amplify SSR
runs in the VPC, narrow `AmplifyCidr` to the connector's SG or remove the
ingress rule entirely and route through the `ClassifierLambdaSG` pattern.

In the interim, password + TLS (rds.force_ssl=1, verified at the client via
`sslmode=require` in drizzle-kit + `ssl: { rejectUnauthorized: false }` in
the pg Pool) is the effective control.

## Known follow-ups

- **IAM DB auth** — currently password-from-Secrets-Manager. Switching to IAM
  auth (`rds-db:connect`) needs `psycopg` token plumbing and
  `EnableIAMDatabaseAuthentication: true` on the cluster. Deferred.
- **Amplify into VPC** — Gen 1 Amplify has no stable egress IP, so
  `AmplifyCidr` defaults to `0.0.0.0/0`. Migrating to Amplify Gen 2 (VPC
  connector) lets us tighten the SG further.
- **S3 lifecycle** — a Glacier transition after 90 days is commented out in
  `template.yaml`; enable once the snapshot history grows.
- **Cost of ECR image versioning** — `build-and-push-classifier.sh` pushes
  both `:<sha>` and `:latest`. Add an ECR lifecycle policy to prune older
  tags after N commits.

## Costs (eu-west-1, rough)

| Item | Baseline |
|---|---|
| Aurora Serverless v2 @ 0.5 ACU | ~$45/mo |
| Aurora storage | ~$2/mo |
| Amplify hosting | ~$5–10/mo |
| Cognito | $0 |
| Secrets Manager | ~$0.80/mo |
| S3 snapshots | < $0.10/mo |
| Lambda (1×5 min × 2 GB daily) | < $1/mo |
| ECR single-tag storage | ~$0.10/mo |
| EventBridge | ~$0 |
| **Total** | **~$55/mo** before traffic |

## Teardown

```bash
./infra/destroy.sh
```

Aurora retains a final snapshot under the cluster ID — delete manually in the
RDS console if you want zero DB spend. The S3 bucket has versioning enabled
so object deletes need a manual empty pass before the bucket can be removed.
