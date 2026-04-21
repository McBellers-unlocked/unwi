# UNWI — AWS infrastructure

CloudFormation-managed durable resources for UN Workforce Intelligence.

```
infra/
  template.yaml     # all durable AWS resources
  deploy.sh         # create / update the stack (idempotent)
  env.sh            # print Amplify-ready env vars from stack outputs
  destroy.sh        # tear down (leaves a final Aurora snapshot behind)
```

## What's in the stack

- **Cognito** user pool + hosted-UI domain + app client with the callback URLs
  for `localhost:3000`, `localhost:3003`, and `unworkforceintelligence.org`.
- **Aurora Serverless v2** Postgres (16.6, 0.5–2 ACU by default, 7-day backups,
  snapshot-on-delete). Placed in the default VPC with a security group that
  allows 5432 from anywhere — Amplify SSR has no stable IP range, and the
  cluster's only auth is a 32-char random password held in Secrets Manager.
  Lock this down once the runtime moves off Amplify.
- **Secrets Manager** — DB master credentials (JSON) + a random 48-char
  `x-cron-secret` that protects `/api/cron/*`.

**Not in the stack** (deliberate):

- Amplify hosting app — needs GitHub OAuth, created manually in the AWS
  console once the GitHub repo exists.
- EventBridge nightly cron — deferred until the Amplify URL is known. Wire it
  up as Step 4 below.
- Route 53 / ACM — DNS lives at Cloudflare. Amplify issues its own ACM cert
  when you add the custom domain; point Cloudflare at the Amplify CNAME.

## Deploy

```bash
cd /c/dev/unwi
export AWS_PROFILE=unwi
./infra/deploy.sh
```

First run takes ~15 minutes (Aurora cluster creation is the slow step).
Subsequent runs are ~2 minutes on changes or seconds on no-ops.

To pre-create a Cognito admin user:

```bash
ADMIN_EMAIL=you@example.org ./infra/deploy.sh
```

Cognito emails a temporary password; first sign-in forces a reset.

## Get the env vars for Amplify

```bash
./infra/env.sh
```

Prints `KEY=VALUE` lines you paste into the Amplify app's Environment
Variables section. Values include the live DB password and cron secret, so
don't redirect this to anywhere tracked.

## Amplify app (manual, one-time, ~10 minutes)

1. Push the repo to `github.com/McBellers-unlocked/unwi` (see top-level README
   for the git remote setup).
2. AWS console → Amplify → "Create new app" → "Host web app" → GitHub,
   authorise, pick the repo and `main` branch.
3. Build settings: Amplify auto-detects Next.js. Accept defaults.
4. Environment variables: paste from `./infra/env.sh`.
5. Advanced settings → Service role: let Amplify create one.
6. Save and deploy. First build ≈ 5 minutes.

## Custom domain (Cloudflare → Amplify)

In Amplify console:

1. App settings → Domain management → "Add domain" → type
   `unworkforceintelligence.org`.
2. Amplify prints a CNAME target (looks like `d1xxxxxxx.cloudfront.net`) and
   a verification CNAME.
3. At Cloudflare (DNS tab for unworkforceintelligence.org):
   - Add CNAME: `@` → Amplify target (enable CNAME flattening if available)
   - Add CNAME: `www` → Amplify target
   - Add verification CNAME as prompted
4. Wait ~15 minutes for Amplify to issue the ACM cert.

## Nightly cron (after Amplify is live)

Run this with your Amplify production URL filled in:

```bash
APP_URL="https://main.xxxxx.amplifyapp.com"  # or unworkforceintelligence.org
CRON_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id unwi/cron-secret \
  --query SecretString --output text \
  --profile unwi --region eu-west-1)

# Creates the EventBridge Scheduler HTTPS target firing 02:00 UTC daily.
# (Keeping this outside the main stack so re-deploys don't need the app URL.)
./infra/scripts/create-cron.sh "$APP_URL" "$CRON_SECRET"
```

The script is a stub for now — fill it in once the Amplify app URL is known.

## Costs (eu-west-1, rough)

| Item | Baseline |
|---|---|
| Aurora Serverless v2 @ 0.5 ACU | ~$45/mo |
| Aurora storage (first 20 GB) | ~$2/mo |
| Amplify hosting (low traffic) | ~$5–10/mo |
| Cognito (< 50k users) | $0 |
| Secrets Manager (2 secrets) | ~$0.80/mo |
| EventBridge Scheduler | ~$0 (<14m schedules/mo) |
| **Total** | **~$55/mo** before traffic |

## Teardown

```bash
./infra/destroy.sh
```

Aurora retains a final snapshot under the cluster ID — delete manually in the
RDS console if you want zero DB spend.
