"""Schema / shape assertions for every artefact build_snapshots.py emits.

No network; runs against the reference classified CSV committed to the repo.
"""
from __future__ import annotations

import csv
import io
import json
from pathlib import Path

import pytest

from build_snapshots import (
    SEGMENT_ORDER,
    build_all,
    PRIMARY_PERIOD,
    COMPARATOR_PERIOD,
)


REFERENCE_CSV = Path(__file__).parent.parent / "reference" / "classified_v2_full_reference.csv"


@pytest.fixture(scope="module")
def artefacts() -> dict[str, bytes]:
    return build_all(REFERENCE_CSV, PRIMARY_PERIOD, COMPARATOR_PERIOD)


def _parse_csv(data: bytes) -> list[dict[str, str]]:
    return list(csv.DictReader(io.StringIO(data.decode("utf-8"))))


def test_headline_numbers_shape(artefacts):
    p = json.loads(artefacts["headline_numbers.json"])
    assert p["total_postings"] > 0
    assert p["digital_postings"] >= 0
    assert 0 <= p["digital_share_pct"] <= 100
    for s in SEGMENT_ORDER:
        assert s in p["segment_counts"]
        assert s in p["segment_shares_pct"]
        assert s in p["primary_shares_pct_apples_to_apples"]
        assert s in p["comparator_shares_pct"]
    assert p["period_from"] <= p["period_to"]
    assert p["comparator_period"]["from"] <= p["comparator_period"]["to"]


def test_segment_distribution_shape(artefacts):
    rows = _parse_csv(artefacts["segment_distribution.csv"])
    segs = {r["segment"] for r in rows}
    assert set(SEGMENT_ORDER) <= segs
    assert "NOT_DIGITAL" in segs
    for r in rows:
        assert r["count"].isdigit()
        assert r["share_of_all"] != ""


def test_organisation_breakdown_shape(artefacts):
    rows = _parse_csv(artefacts["organisation_breakdown.csv"])
    assert rows
    for r in rows:
        assert r["organisation"]
        assert int(r["digital_postings"]) >= 1, "orgs with 0 digital should be filtered"


def test_source_coverage_shape(artefacts):
    rows = _parse_csv(artefacts["source_coverage.csv"])
    assert rows
    for r in rows:
        assert r["source"]
        assert int(r["total_count"]) >= int(r["digital_count"])


def test_comparator_segment_shares_shape(artefacts):
    rows = _parse_csv(artefacts["comparator_segment_shares.csv"])
    assert {r["segment"] for r in rows} == set(SEGMENT_ORDER)


def test_concurrency_timeseries_shape(artefacts):
    p = json.loads(artefacts["concurrency_timeseries.json"])
    assert {s["segment"] for s in p["segments"]} == set(SEGMENT_ORDER)
    for s in p["segments"]:
        for point in s["points"]:
            assert point["month"]
            assert point["distinct_organisations"] >= 0


def test_qoq_change_shape(artefacts):
    p = json.loads(artefacts["qoq_change.json"])
    assert {s["segment"] for s in p["segments"]} == set(SEGMENT_ORDER)


def test_collision_profiles_shape(artefacts):
    p = json.loads(artefacts["collision_profiles.json"])
    for profile in p["profiles"]:
        assert profile["organisation_count"] >= 3
        assert len(profile["organisations"]) == profile["organisation_count"]
        assert profile["segment"] in SEGMENT_ORDER


def test_staff_vs_consultant_shape(artefacts):
    p = json.loads(artefacts["staff_vs_consultant.json"])
    assert {s["segment"] for s in p["segments"]} == set(SEGMENT_ORDER)


def test_cut_manifest_shape(artefacts):
    p = json.loads(artefacts["cut_manifest.json"])
    assert p["classifier_version"]["file_sha1"]
    assert p["period_from"] <= p["period_to"]
    assert p["comparator_from"] <= p["comparator_to"]
    assert p["apples_to_apples"]["common_source_count"] == len(
        p["apples_to_apples"]["common_sources"]
    )


def test_all_12_artefact_names_registered():
    from build_snapshots import ARTEFACT_NAMES

    assert len(ARTEFACT_NAMES) == 12
