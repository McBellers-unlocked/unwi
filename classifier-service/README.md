# classifier-service

The authoritative analytical engine for UN Workforce Intelligence. Runs as an
AWS Lambda container image, nightly at 02:00 UTC via EventBridge.

Flow: Supabase jobs API → `classify_aggregator.py` → `classifier_v2.py` →
classified CSV → `build_snapshots.py` → 12 artefacts → S3 + Aurora.

## Layout

```
classifier-service/
├── Dockerfile
├── requirements.txt
├── classifier_v2.py          # LOCKED. User-supplied verbatim.
├── classify_aggregator.py    # User-supplied; minor out_dir adapter patch.
├── build_snapshots.py        # Produces the 12 artefacts from classified CSV.
├── handler.py                # Lambda entrypoint; orchestrates fetch → build → upload → DB write.
├── duty_stations.json        # Geocoded top-100 duty stations (Nominatim, committed).
├── reference/                # Known-good outputs for byte-for-byte verification.
├── tests/                    # Pure shape assertions; no network.
└── out/                      # Local dry-run output (gitignored).
```

## Period constants (hardcoded in build_snapshots.py)

- `ANCHOR_DATE`: 2025-08-01
- `PRIMARY_PERIOD`: 2026-01-01 to 2026-03-31 (Q1 2026)
- `COMPARATOR_PERIOD`: 2025-10-01 to 2025-12-31 (Q4 2025)

Apples-to-apples comparison restricts both periods to sources that produced
≥1 record in both windows.

## 12 artefacts

1. `headline_numbers.json`
2. `segment_distribution.csv`
3. `organisation_breakdown.csv`
4. `geography.csv`
5. `grade_distribution.csv`
6. `source_coverage.csv`
7. `comparator_segment_shares.csv`
8. `concurrency_timeseries.json`
9. `qoq_change.json`
10. `collision_profiles.json`
11. `staff_vs_consultant.json`
12. `cut_manifest.json`

Written to `s3://$S3_BUCKET/snapshots/{YYYY-MM-DD}/…` and mirrored to
`s3://$S3_BUCKET/snapshots/latest/…`.

## Local dev

From the repo root:

```
docker compose up -d postgres          # local Aurora stand-in
docker compose build classifier
docker compose run --rm classifier python -c \
  "from handler import lambda_handler; lambda_handler({'dry_run': True}, None)"
```

Dry-run skips S3 + DB writes and dumps all 12 artefacts to `./out/`.

## Verification

Two test layers:

1. **Aggregation** — `tests/test_reference_outputs.py` runs `build_all()` against
   the committed 8-col `classified_v2_full_reference.csv` and diffs output
   byte-for-byte against the reference artefacts for the 5 that depend only on
   `(id, title, organization, source, segment, confidence, reason, posted_date)`:
   `headline_numbers.json`, `segment_distribution.csv`,
   `organisation_breakdown.csv`, `source_coverage.csv`,
   `comparator_segment_shares.csv`. Plus structural diff of `cut_manifest.json`
   on stable fields (classifier SHA, periods, common sources) — ignores
   environmental metadata (`cut_generated_at`, `snapshot_path`).

2. **Classifier precision** — `tests/test_classifier_precision.py` runs
   `classify()` over every row in `ground_truth_labeled_set.csv`, computes
   precision per segment, asserts overall ≥ 0.95. Prints per-segment table.

Shape tests in `tests/test_build_snapshots_shapes.py` cover all 12 artefact
schemas.

```
pip install -r requirements-dev.txt
python -m pytest tests/ -v
```

`geography.csv` and `grade_distribution.csv` need `location` and `grade_code`
which the 8-col reference CSV doesn't carry; those are tested end-to-end
when the Lambda runs against live Supabase data (richer CSV via
`classify_aggregator.fetch_and_classify`).

## Production deploy

See `infra/scripts/build-and-push-classifier.sh` (built in Phase C).

## Classifier update procedure

`classifier_v2.py` is locked — do not edit it by hand. To ship a new version:

1. Drop the new `classifier_v2.py` into this directory.
2. `python -m pytest classifier-service/tests` — shape gate.
3. `bash infra/scripts/rotate-classifier-image.sh` — build + push + update.
4. `bash infra/scripts/invoke-classifier-manual.sh` — manual snapshot.
5. Open the dashboard, verify Section 9 shows the new classifier SHA.

## Non-digital classifier roadmap

`classifier_v2.py` is the seam. Future `classifier_nondigital_v1.py` lives
alongside, writes to `s3://$S3_BUCKET/snapshots/latest/nondigital/…`, and
mirrors this directory structure. Deferred to Q3 2026.
