# Reference outputs

Drop known-good outputs from the classifier here. `build_snapshots.py`
dry-run diffs against them as the Phase A verification gate.

Expected files:
- `classified_v2_full_reference.csv` — classified dataset (8 columns)
- `ground_truth_labeled_set.csv` — hand-labelled validation set for precision
- 8 reference artefacts (`headline_numbers.json`, `segment_distribution.csv`, …)

All files are committed so verification is reproducible.

## Divergence from the Q1 2026 deck

Reference outputs here reflect **classifier v2** (SHA `7f702e1d76597307ede1676a71c250b11841ed92`,
0.997 precision on the 2,676-row gold sample). The earlier Q1 2026 deck was
produced by a v1.x pipeline with narrower segment definitions and, in some
cases, a different source set or data cut.

Numerical divergence between the deck and v2 outputs is **expected and
documented**. Do not reconcile against deck figures. The authoritative values
going forward are the artefacts produced by running `build_snapshots.py`
against this classifier at this SHA.

Specific known divergences (see `scripts/spot_check_output.txt`):

- `qoq_change.json` and `staff_vs_consultant.json` role totals run higher
  than the deck across most segments (ITOPS 148 vs 113; CYBER 44 vs 34).
  Direction of change matches; magnitudes differ.
- `concurrency_timeseries.json` is capped at the primary-period end so peaks
  land inside Q1. The deck's peaks are comparable once the 2026-04 partial
  month is excluded.
- Deck uses a 14-way segment split. v2 taxonomy is locked at 9 segments;
  sub-segments (UX/UI, Data Engineering, Data Analytics & BI) roll up into
  PRODUCT / DATA_AI. Row-by-row deck comparison is therefore not 1:1.

## POLICY_ADVISORY is a v2-specific segment

v2 surfaces POLICY_ADVISORY as a distinct segment capturing AI governance,
digital policy, Technology-for-Development (T4D), digital-readiness
assessments, and technology-advisory roles. The Q1 2026 deck's 14-segment
taxonomy did not surface this as a standalone bucket; v2 does because these
roles have emerged as an institutionally distinct category across the UN
system (UNICEF T4D portfolio, ESCAP/ESCWA digital development experts, the
SG Envoy on Technology's AI Governance office, Technology Bank for LDCs,
UNCTAD digital customs work, WHO digital-health-and-AI advisory, and
equivalents elsewhere).

`scripts/spot_check.py` Section 8 samples 20 random POLICY_ADVISORY rows with
title + organisation + rule trace so reviewers can eyeball whether the
classifier is over-calling; the current sample shows clean fires with no
generic "Policy Officer" bleed-in.

Byte-for-byte reproducibility gate still passes on 5 artefacts
(`headline_numbers`, `segment_distribution`, `organisation_breakdown`,
`source_coverage`, `comparator_segment_shares`) and on the stable fields of
`cut_manifest`. See `tests/test_reference_outputs.py`.
