# UN Workforce Intelligence (UNWI) — v0.1 prototype

**System-level workforce analytics for UN80 and beyond.** A UNICC prototype.

This is the pitch artefact for positioning UNICC as the workforce intelligence
backbone of the UN system. Not for external distribution.

## Stack

Next.js 15 (App Router, TS strict) · Tailwind + shadcn/ui · Recharts ·
AWS Amplify (hosting) · AWS Cognito (auth, hosted UI) · Aurora Serverless v2
Postgres · Drizzle ORM over `pg`.

## Data model

```
Supabase jobs-api  →  cron job (02:00 UTC daily)  →  compute findings  →  Aurora snapshot tables  →  dashboard
                     ^                                                    ^
                     x-cron-secret protected                              daily_snapshots / agency_snapshots / skill_cluster_snapshots
```

The dashboard reads EXCLUSIVELY from Aurora. No in-memory cache of the raw API.
`computeObservatoryData()` in `src/lib/compute/observatory.ts` is the single
source of every number rendered anywhere.

## Clone → running in 5 minutes

```bash
# 1. Dependencies
npm install

# 2. Local Postgres
docker compose up -d

# 3. Env
cp .env.example .env.local
# Fill Cognito values or skip for headless dev (middleware still gates UI).
# Anon Supabase key is already populated in .env.example.

# 4. Schema
npm run db:push

# 5. Dev server
npm run dev
```

Open http://localhost:3000 — you'll land on the empty state because no
snapshot has run yet. Click **Run first snapshot**, paste the `CRON_SECRET`
from your `.env.local`, wait ~30 seconds. The page reloads with real data.

## Sanity-check the numbers without a DB

Before wiring up Aurora, verify the compute path:

```bash
npm run sanity-check
```

Pulls the live aggregator, runs `computeObservatoryData()`, writes
`findings.json` at repo root, prints the headline counters. No DB, no UI.
Fast loop for iterating rules.

## Cognito setup

Minimal one-pool, email/password, hosted-login:

```bash
# 1. Create user pool
aws cognito-idp create-user-pool --pool-name unwi --region eu-west-1 \
  --auto-verified-attributes email --username-attributes email \
  --policies '{"PasswordPolicy":{"MinimumLength":12,"RequireUppercase":true,"RequireLowercase":true,"RequireNumbers":true,"RequireSymbols":false}}'

# 2. Create the app client (note the client id)
aws cognito-idp create-user-pool-client --user-pool-id <pool-id> \
  --client-name unwi-web --generate-secret false \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --allowed-o-auth-flows code --allowed-o-auth-scopes openid email profile \
  --allowed-o-auth-flows-user-pool-client \
  --callback-urls "http://localhost:3000/api/auth/callback" "https://unworkforceintelligence.org/api/auth/callback" \
  --logout-urls "http://localhost:3000/login" "https://unworkforceintelligence.org/login" \
  --supported-identity-providers COGNITO

# 3. Attach a hosted-UI domain
aws cognito-idp create-user-pool-domain --user-pool-id <pool-id> --domain unwi-auth

# 4. Create your admin user
aws cognito-idp admin-create-user --user-pool-id <pool-id> \
  --username you@example.org --temporary-password 'ChangeMe!123' \
  --user-attributes Name=email,Value=you@example.org Name=email_verified,Value=true
```

Fill `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_REGION`, and
`COGNITO_DOMAIN` in `.env.local`.

To add another user later: the same `admin-create-user` command.

## Amplify deploy

1. Push the repo to a private Amplify-connected Git remote.
2. Set the env vars from `.env.example` in the Amplify console (use the Aurora
   Serverless v2 connection string for `DATABASE_URL`).
3. Scheduled trigger: EventBridge rule, cron `0 2 * * ? *`, target = Amplify
   scheduled function, payload = POST to `/api/cron/snapshot` with header
   `x-cron-secret: $CRON_SECRET`. Alternative: AWS EventBridge Scheduler hitting
   the HTTPS URL directly.
4. First deploy is empty — hit `/api/cron/snapshot-manual` from the empty-state
   button OR via curl to seed today's snapshot.

## Manual seed via curl

```bash
curl -X POST https://unworkforceintelligence.org/api/cron/snapshot-manual \
  -H "x-cron-secret: <your-secret>" \
  --max-time 120
```

## Methodology notes

### Duplication Radar cost

Each duplication event is counted as **one avoided recruitment**. Cost per
recruitment is USD 20,000 — a conservative midpoint between SHRM's standard
cost-per-hire benchmark (USD 4,700) and executive benchmark (USD 28,329),
reflecting international P-level search complexity. Converted to EUR at the
env-var `USD_TO_EUR_RATE` (default 0.92). Replace with the JIU-specific figure
once it's finalised.

### Decentralisation HQ cluster

The HQ cluster is defined as postings whose **location or country contains any
of**: New York, Geneva, Vienna, Rome, Nairobi, Copenhagen. Case-insensitive
substring match. Copenhagen is included because UNICEF/UN Women/UNOPS treat it
as a major ops hub. The ranked table restricts to agencies with ≥20 P-level
postings so noise (single-post agencies at 100% HQ) doesn't distort the
leaderboard.

### Skill cluster tagging

Keyword-based substring match on `title + description`, lowercased. A role can
belong to multiple clusters (counted independently). Keywords and cluster
names are in `src/lib/compute/skills.ts`. Phase 2 swaps in an embedding-based
classifier; cluster names are stable across versions so chart legends don't
churn.

### UN common system filter

Hardcoded whitelist in `src/lib/compute/un-system.ts`, applied at compute
time. NATO, EU Commission, European Space Agency, and other multilaterals are
excluded. The UI toggle for multilateral view is Phase 2; v0.1 is UN-only.

### YTD anchor

Default 2025-08-01 (env var `YTD_ANCHOR_DATE`). Change the env var if the
brief needs a different reporting window.

## Repo layout

```
src/
  app/
    layout.tsx            # root layout, brand header
    page.tsx              # dashboard (reads Aurora only)
    login/page.tsx        # Cognito hosted-UI redirect
    api/
      cron/
        snapshot/          # nightly, EventBridge
        snapshot-manual/   # human seed / ad-hoc
      auth/
        callback/          # Cognito OAuth2 code exchange
        logout/            # clear cookie + Cognito logout
  components/
    header.tsx
    sidebar.tsx
    footer.tsx
    module-shell.tsx
    modules/              # 7 modules, one file each
    empty-state.tsx
  lib/
    compute/
      observatory.ts      # computeObservatoryData — single source of truth
      types.ts            # ObservatoryFindings shape
      skills.ts           # keyword clusters
      un-system.ts        # UN whitelist
      normalize.ts        # title normalisation + Jaccard
    cron/
      run-snapshot.ts     # shared runner for both cron routes
    db/
      schema.ts           # Drizzle schema
      client.ts           # pg Pool + drizzle() singleton
      migrate.ts          # CLI runner
      repo.ts             # read-side queries
    supabase.ts           # jobs-api client
    cognito.ts            # hosted-UI URL builders
  middleware.ts           # Cognito cookie gate
scripts/
  sanity-check.ts         # pull + compute, no DB
migrations/
  0001_initial.sql
```

## Out of scope for v0.1

Code comments only — do not build:

- Semantic/embedding-based duplication detection (Phase 2)
- ML skills classifier (Phase 2, currently keyword)
- Per-agency tenancy
- Email briefings, CSV exports
- Saved views / annotations
- Multilateral-view UI toggle (UN-only hardcoded in v0.1)
