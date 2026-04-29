"""Shape and invariant tests for build_segment_window_aggregates.

The output drives Section 02's rolling-window toggle, so the schema and
monotonicity (count(30) <= count(60) <= count(90)) must hold.
"""
from __future__ import annotations

import csv
import io
from datetime import date
from pathlib import Path

import pytest

from build_snapshots import (
    SEGMENT_ORDER,
    WINDOW_DAYS,
    build_all,
    build_segment_window_aggregates,
    load_rows,
)


REFERENCE_CSV = (
    Path(__file__).parent.parent / "reference" / "classified_v2_full_reference.csv"
)


@pytest.fixture(scope="module")
def rows():
    return load_rows(REFERENCE_CSV)


@pytest.fixture(scope="module")
def aggregates(rows):
    snapshot = max(r.posted_date for r in rows if r.posted_date)
    raw = build_segment_window_aggregates(rows, snapshot)
    return list(csv.DictReader(io.StringIO(raw.decode("utf-8"))))


def test_row_count_is_three_windows_times_nine_segments(aggregates):
    assert len(aggregates) == len(WINDOW_DAYS) * len(SEGMENT_ORDER)


def test_every_window_segment_pair_present(aggregates):
    pairs = {(int(r["window_days"]), r["segment"]) for r in aggregates}
    expected = {(w, s) for w in WINDOW_DAYS for s in SEGMENT_ORDER}
    assert pairs == expected


def test_role_count_monotonic_across_windows(aggregates):
    by_seg: dict[str, dict[int, int]] = {}
    for r in aggregates:
        by_seg.setdefault(r["segment"], {})[int(r["window_days"])] = int(
            r["role_count"]
        )
    for seg, counts in by_seg.items():
        assert counts[30] <= counts[60] <= counts[90], (
            f"{seg}: 30={counts[30]} 60={counts[60]} 90={counts[90]} not monotonic"
        )


def test_org_count_never_exceeds_role_count(aggregates):
    for r in aggregates:
        assert int(r["org_count"]) <= int(r["role_count"]), r


def test_excludes_non_digital_rows(rows):
    snapshot = max(r.posted_date for r in rows if r.posted_date)
    raw = build_segment_window_aggregates(rows, snapshot)
    parsed = list(csv.DictReader(io.StringIO(raw.decode("utf-8"))))
    assert all(r["segment"] in SEGMENT_ORDER for r in parsed)
    assert "NOT_DIGITAL" not in {r["segment"] for r in parsed}


def test_dry_run_default_uses_max_posted_date(rows):
    """build_all with no snapshot_date should anchor on max(posted_date)
    so the reference fixture (posted Jan-Apr 2026) produces non-empty
    aggregates even when run in 2027+."""
    artefacts = build_all(REFERENCE_CSV)
    raw = artefacts["segment_window_aggregates.csv"]
    rows_out = list(csv.DictReader(io.StringIO(raw.decode("utf-8"))))
    expected_snapshot = max(r.posted_date for r in rows if r.posted_date)
    assert all(
        r["snapshot_date"] == expected_snapshot.isoformat() for r in rows_out
    )
    total_roles = sum(int(r["role_count"]) for r in rows_out)
    assert total_roles > 0, "reference fixture should yield non-empty windows"


def test_explicit_snapshot_date_honoured(rows):
    explicit = date(2026, 4, 21)
    raw = build_segment_window_aggregates(rows, explicit)
    parsed = list(csv.DictReader(io.StringIO(raw.decode("utf-8"))))
    assert all(r["snapshot_date"] == "2026-04-21" for r in parsed)
