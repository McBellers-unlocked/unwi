"""Byte-for-byte diff between build_snapshots output and committed reference.

Reproducible artefacts: 5 that depend only on (id, title, organization, source,
segment, confidence, reason, posted_date). These MUST match exactly — any drift
is a regression.

The 8-column reference CSV doesn't carry location or grade, so geography.csv
and grade_distribution.csv can't be reproduced here; they're tested end-to-end
when the Lambda runs against live Supabase data.

cut_manifest.json differs on environmental fields (cut_generated_at,
snapshot_path, last_commit_touching_classifier) — we diff only the stable
fields.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from build_snapshots import build_all, PRIMARY_PERIOD, COMPARATOR_PERIOD


REFERENCE_DIR = Path(__file__).parent.parent / "reference"
REFERENCE_CSV = REFERENCE_DIR / "classified_v2_full_reference.csv"


BYTE_FOR_BYTE = [
    "headline_numbers.json",
    "segment_distribution.csv",
    "organisation_breakdown.csv",
    "source_coverage.csv",
    "comparator_segment_shares.csv",
]


@pytest.fixture(scope="module")
def artefacts() -> dict[str, bytes]:
    return build_all(REFERENCE_CSV, PRIMARY_PERIOD, COMPARATOR_PERIOD)


@pytest.mark.parametrize("name", BYTE_FOR_BYTE)
def test_byte_for_byte_match(artefacts, name):
    reference = (REFERENCE_DIR / name).read_bytes()
    actual = artefacts[name]
    assert (
        actual == reference
    ), f"{name} differs from reference. Diff first 500 chars:\n" \
       f"REFERENCE: {reference[:500]!r}\nACTUAL:    {actual[:500]!r}"


def test_cut_manifest_stable_fields_match(artefacts):
    reference = json.loads((REFERENCE_DIR / "cut_manifest.json").read_bytes())
    actual = json.loads(artefacts["cut_manifest.json"])

    for key in ("period_from", "period_to", "comparator_from", "comparator_to"):
        assert actual[key] == reference[key]

    assert (
        actual["classifier_version"]["file_sha1"]
        == reference["classifier_version"]["file_sha1"]
    ), "classifier_v2.py has drifted — precision invariants no longer guaranteed"

    ref_atoa = reference["apples_to_apples"]
    actual_atoa = actual["apples_to_apples"]
    assert actual_atoa["common_sources"] == ref_atoa["common_sources"]
    assert actual_atoa["common_source_count"] == ref_atoa["common_source_count"]
    assert (
        actual_atoa["primary_common_sources_total_rows"]
        == ref_atoa["primary_common_sources_total_rows"]
    )
    assert (
        actual_atoa["comparator_common_sources_total_rows"]
        == ref_atoa["comparator_common_sources_total_rows"]
    )
    assert (
        actual_atoa["primary_common_sources_digital_rows"]
        == ref_atoa["primary_common_sources_digital_rows"]
    )
    assert (
        actual_atoa["comparator_common_sources_digital_rows"]
        == ref_atoa["comparator_common_sources_digital_rows"]
    )
