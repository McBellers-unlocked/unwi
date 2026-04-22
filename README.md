# UN Workforce Intelligence (UNWI)

**System-level workforce analytics for UN80 and beyond.** A UNICC prototype.

Release: **Q1 2026 Digital Issue**. Domain: `unworkforceintelligence.org`.

Not for external distribution.

## Architecture

```
Supabase jobs API
        │
        ▼
 classify_aggregator.py  (fetch + paginate)
        │
        ▼
    classifier_v2.py     (locked 9-segment taxonomy, 0.997 precision)
        │
        ▼
  build_snapshots.py     (12 artefacts)
        │
        ├──► s3://<bucket>/snapshots/{YYYY-MM-DD}/...
        ├──► s3://<bucket>/snapshots/latest/...
        │
        └──► Aurora Serverless v2   ◄── Next.js (pure reader)
                                       │
                                       ▼
                                    dashboard
```

- **Python classifier Lambda** is the sole writer — runs nightly 02:00 UTC via
  EventBridge, produces 12 snapshot artefacts, UPSERTs into Aurora.
- **Next.js app** is a pure reader — every number on the dashboard comes from
  Aurora, nothing is computed in TypeScript.

## Stack

Next.js 15 (App Router, TS strict) · Tailwind · Recharts ·
AWS Amplify (hosting) · AWS Cognito (auth, hosted UI) · Aurora Serverless v2
Postgres · Drizzle ORM over `pg` (reads only) · AWS Lambda + ECR (Python 3.13
classifier container) · EventBridge (nightly cron) · S3 (artefact history).

## Brand / palette

Primary navy `#0F2540`, accent teal `#4DAFA8`, muted slate `#5A6C7D`,
takeaway background `#F5F7F8`. Source Serif 4 for headings, Inter for body.

## Repo layout

```
classifier-service/       Python Lambda container image
  classifier_v2.py        LOCKED regex classifier (DO NOT EDIT)
  classify_aggregator.py  Supabase fetch + classify → rich CSV
  build_snapshots.py      12 artefacts from classified CSV
  handler.py              Lambda entrypoint (fetch → build → S3 → Aurora)
  reference/              Known-good outputs for byte-for-byte verification
  tests/                  pytest suite (shape, byte-for-byte, precision)

src/
  app/
    layout.tsx            Root layout + brand header
    page.tsx              Dashboard (renders 10 sections)
    login/page.tsx        Cognito hosted-UI redirect
    api/auth/*            OAuth2 callback + logout
  components/
    header.tsx, footer.tsx, sidebar.tsx, empty-state.tsx
    section-shell.tsx     SectionShell, DecisionBar, StatTile primitives
    sections/             10 dashboard sections (cover → roadmap)
  lib/
    data.ts               Read-side data layer (server-only)
    segments.ts           9-code taxonomy + human labels (client-safe)
    cognito.ts            Hosted-UI URL builders
    db/{schema,client,migrate}.ts
  middleware.ts           Cognito cookie gate

infra/
  template.yaml           CloudFormation: Cognito + Aurora + Secrets + S3 + ECR +
                          Lambda + EventBridge + SG ingress rules
  deploy.sh               Idempotent stack create/update
  scripts/
    init-db.sh            drizzle-kit push to live Aurora
    build-and-push-classifier.sh   docker build → ECR
    rotate-classifier-image.sh     update-function-code to new tag
    invoke-classifier-manual.sh    one-shot synchronous snapshot

migrations/
  0001_initial.sql        v0.1 schema (retained for history)
  0002_v2_pivot.sql       v2 schema — 8 tables feeding the dashboard
```

## Local dev

```bash
# 1. Dependencies
npm install --legacy-peer-deps
pip install -r classifier-service/requirements-dev.txt

# 2. Local Postgres (docker) + classifier container for dry-run
docker compose up -d postgres

# 3. Env
cp .env.example .env.local
# Fill Cognito values for the live auth flow, or leave blank for headless dev
# (middleware auto-opens when Cognito vars are unset).

# 4. Schema
npm run db:push

# 5. Dev server
npm run dev
```

Open http://localhost:3000 — the dashboard renders EmptyState until the
classifier Lambda produces a snapshot. To seed local Postgres for UI work,
point `build_snapshots.py` at the reference CSV and write the artefacts
directly into your DB (no helper script yet — drop a one-off SQL seed in
`/tmp` and `psql` it in).

## Classifier dry-run

From the repo root:

```bash
cd classifier-service
python -m pytest tests/ -v         # 18 tests, ~1 second
python3 build_snapshots.py reference/classified_v2_full_reference.csv out/
diff reference/headline_numbers.json out/headline_numbers.json
```

## Production deploy

Three phases the first time; subsequent runs skip whatever is already in place.

### 1. Durable infra (Cognito + Aurora + Secrets Manager + S3 + ECR)

```bash
export AWS_PROFILE=unwi
AWS_REGION=eu-west-1 \
DEV_IP_CIDR="203.0.113.42/32" \
ADMIN_EMAIL=you@example.org \
./infra/deploy.sh
```

First run ~15 min (Aurora cluster creation). `ClassifierImageUri` is empty,
so the Lambda isn't created yet — only the ECR repo.

### 2. Build and push the classifier image

```bash
./infra/scripts/build-and-push-classifier.sh
# prints the tag, e.g. 123456789012.dkr.ecr.eu-west-1.amazonaws.com/unwi-classifier:abc1234
```

### 3. Re-deploy with the image URI to create the Lambda + EventBridge rule

```bash
CLASSIFIER_IMAGE_URI="<tag-from-step-2>" \
DEV_IP_CIDR="203.0.113.42/32" \
./infra/deploy.sh
```

### 4. Apply the v2 schema to Aurora

```bash
./infra/scripts/init-db.sh
```

### 5. Wire Amplify (manual, ~10 min)

GitHub repo → Amplify console → connect → paste env vars from
`./infra/env.sh` → deploy. Cognito callback URLs in `infra/template.yaml`
already include `unworkforceintelligence.org`.

### 6. Trigger the first snapshot

```bash
./infra/scripts/invoke-classifier-manual.sh
```

Synchronous invoke (≤10 min). Watch CloudWatch Logs to confirm success,
then reload the dashboard — all 10 sections now have data.

## Classifier update procedure

`classifier_v2.py` is **LOCKED**. To ship a new classifier version:

```bash
# 1. Drop the new classifier_v2.py into classifier-service/
# 2. Validate locally
cd classifier-service && python -m pytest tests/ -v

# 3. Build, push, rotate
../infra/scripts/build-and-push-classifier.sh
../infra/scripts/rotate-classifier-image.sh

# 4. Trigger a snapshot
../infra/scripts/invoke-classifier-manual.sh

# 5. Verify: Section 9 of the dashboard shows the new classifier SHA
```

The precision test in `tests/test_classifier_precision.py` asserts overall
precision ≥ 0.95. A new classifier that regresses below that threshold will
fail the build before ever reaching prod.

## Non-digital classifier roadmap

`classifier_v2.py` is the seam. The Q3 2026 release will add
`classifier_nondigital_v1.py` covering 10 additional segments (humanitarian,
climate, public health, education, social policy, legal, governance, finance,
supply chain, HR). Artefacts publish under `s3://<bucket>/snapshots/latest/nondigital/`
with a mirrored Aurora schema. Existing dashboard shell is reused.

## Cost (eu-west-1, approximate)

| Item | Baseline |
|---|---|
| Aurora Serverless v2 @ 0.5 ACU | ~$45/mo |
| Aurora storage (first 20 GB) | ~$2/mo |
| Amplify hosting | ~$5–10/mo |
| Cognito (< 50k users) | $0 |
| Secrets Manager (2 secrets) | ~$0.80/mo |
| S3 snapshots (< 1 GB) | < $0.10/mo |
| Lambda classifier (1 run/day × 5 min × 2 GB) | < $1/mo |
| ECR image storage (single tag) | ~$0.10/mo |
| EventBridge | ~$0 |
| **Total** | **~$55/mo** before traffic |
