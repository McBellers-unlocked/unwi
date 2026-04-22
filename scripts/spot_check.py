#!/usr/bin/env python3
"""Human-readable spot-check of the 7 artefacts that have shape tests but no
reference diff. Rerun after any classifier or aggregation change and diff the
output against scripts/spot_check_output.txt to spot silent drift.

Run from repo root:
    python3 scripts/spot_check.py
"""
from __future__ import annotations

import json
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "classifier-service"))

from build_snapshots import (  # noqa: E402
    COMPARATOR_PERIOD,
    PRIMARY_PERIOD,
    SEGMENT_ORDER,
    build_all,
)

REFERENCE_CSV = ROOT / "classifier-service" / "reference" / "classified_v2_full_reference.csv"
OUT_PATH = ROOT / "scripts" / "spot_check_output.txt"


class Tee:
    def __init__(self):
        self.lines: list[str] = []

    def write(self, s: str = "") -> None:
        print(s)
        self.lines.append(s)

    def dump(self, path: Path) -> None:
        path.write_text("\n".join(self.lines) + "\n", encoding="utf-8")


def section(tee: Tee, n: int, title: str) -> None:
    tee.write("")
    tee.write("=" * 78)
    tee.write(f"{n}. {title}")
    tee.write("=" * 78)


def report_header(tee: Tee, artefacts: dict[str, bytes]) -> None:
    manifest = json.loads(artefacts["cut_manifest.json"])
    tee.write("UNWI spot-check")
    tee.write("=" * 78)
    tee.write(f"Input CSV        : {REFERENCE_CSV.relative_to(ROOT)}")
    tee.write(
        f"Primary period   : {PRIMARY_PERIOD[0].isoformat()} → {PRIMARY_PERIOD[1].isoformat()}"
    )
    tee.write(
        f"Comparator period: {COMPARATOR_PERIOD[0].isoformat()} → {COMPARATOR_PERIOD[1].isoformat()}"
    )
    tee.write(f"Classifier SHA-1 : {manifest['classifier_version']['file_sha1']}")
    tee.write(f"Artefacts present: {', '.join(sorted(artefacts.keys()))}")


def check_collisions(tee: Tee, artefacts: dict[str, bytes]) -> None:
    section(tee, 1, "COLLISION PROFILES (top 10 by organisation_count)")
    tee.write("Deck reference (for eyeball):")
    tee.write("  Data Analyst                 10")
    tee.write("  Data Scientist                9")
    tee.write("  Information Systems Officer   9")
    tee.write("  Information Management        8")
    tee.write("  Knowledge Management          4")
    tee.write("")
    payload = json.loads(artefacts["collision_profiles.json"])
    top = payload["profiles"][:10]
    for p in top:
        orgs_preview = ", ".join(p["organisations"])
        tee.write(
            f'"{p["canonical_title"]}" [{p["segment"]}]: '
            f'{p["organisation_count"]} orgs — {orgs_preview}'
        )
    tee.write(f"\nTotal collision profiles (≥3 orgs): {len(payload['profiles'])}")


def check_concurrency(tee: Tee, artefacts: dict[str, bytes]) -> None:
    section(tee, 2, "CONCURRENCY TIMESERIES (peak month per segment)")
    tee.write("Deck reference (for eyeball):")
    tee.write("  ITOPS   peak 14 orgs in 2026-03")
    tee.write("  DATA_AI peak 12 orgs (month per deck slide 7)")
    tee.write("")
    payload = json.loads(artefacts["concurrency_timeseries.json"])
    for s in payload["segments"]:
        points = s["points"]
        if not points:
            tee.write(f"{s['segment']:15} no data")
            continue
        peak = max(points, key=lambda p: p["distinct_organisations"])
        tee.write(
            f"{s['segment']:15} peak {peak['distinct_organisations']:3} orgs in {peak['month']}"
        )


def check_qoq(tee: Tee, artefacts: dict[str, bytes]) -> None:
    section(tee, 3, "QoQ CHANGE (per segment)")
    tee.write(
        "NOTE: the deck uses a 14-way split (e.g. UX/UI, Data Engineering, "
    )
    tee.write(
        "Data Analytics & BI as separate rows). Our classifier taxonomy is locked "
    )
    tee.write(
        "at 9 segments. Direct numeric match to deck rows is not expected; the "
    )
    tee.write(
        "deck's 'IT Service & Operations' ≈ ITOPS, 'Cybersecurity' ≈ CYBER, "
    )
    tee.write(
        "'Cloud & Infrastructure' ≈ CLOUD, 'Information Management & GIS' ≈ INFO_KM. "
    )
    tee.write(
        "'Data Analytics & BI', 'Data Science & AI/ML', 'Data Engineering' all "
    )
    tee.write("roll up into DATA_AI. 'UX/UI', 'Software Engineering' roll into PRODUCT/")
    tee.write("SOFTWARE.")
    tee.write("")
    tee.write("Deck reference (for eyeball, approximate mapping):")
    tee.write("  IT Service & Operations     67 →  113 (+46, +69%)")
    tee.write("  Data Analytics & BI         55 →   49  (-6, -11%)")
    tee.write("  Cybersecurity               20 →   34 (+14, +70%)")
    tee.write("  Information Management GIS  17 →   33 (+16, +94%)")
    tee.write("  Data Science & AI/ML        12 →   22 (+10, +83%)")
    tee.write("  Cloud & Infrastructure       6 →   14  (+8, +133%)")
    tee.write("")
    payload = json.loads(artefacts["qoq_change.json"])
    tee.write(f"{'SEGMENT':18} {'Q4 2025':>8} {'Q1 2026':>8} {'Δ abs':>8} {'Δ %':>8}")
    tee.write("-" * 56)
    for s in payload["segments"]:
        tee.write(
            f"{s['segment']:18} "
            f"{s['comparator_count']:>8} "
            f"{s['primary_count']:>8} "
            f"{s['delta_abs']:>+8} "
            f"{s['delta_pct']:>+7.1f}%"
        )


def check_staff_vs_consultant(tee: Tee, artefacts: dict[str, bytes]) -> None:
    section(tee, 4, "STAFF vs CONSULTANT (per segment)")
    tee.write(
        "NOTE: 8-col reference CSV has no `level` or `description` column. "
    )
    tee.write(
        "Consultant detection falls back to title-string heuristics "
    )
    tee.write(
        "(looks for 'consultant', 'consultancy', 'contractor', 'individual contractor' "
    )
    tee.write(
        "in the title). Live Lambda path uses `level` from Supabase for higher "
    )
    tee.write("fidelity; numeric values here will drift once that lands.")
    tee.write("")
    tee.write("Deck reference (for eyeball, different taxonomy split):")
    tee.write("  UX/UI                      10 roles, 80% consultant")
    tee.write("  Software Engineering       45 roles, 53% consultant")
    tee.write("  Data Engineering           13 roles, 46% consultant")
    tee.write("  Data Analytics & BI       137 roles, 39% consultant")
    tee.write("  IT Service & Operations   222 roles,  6% consultant")
    tee.write("  Cybersecurity              67 roles,  9% consultant")
    tee.write("")
    payload = json.loads(artefacts["staff_vs_consultant.json"])
    tee.write(
        f"{'SEGMENT':18} {'TOTAL':>7} {'STAFF':>7} {'CONSULTANT':>11} {'CONS %':>8}"
    )
    tee.write("-" * 56)
    for s in payload["segments"]:
        total = s["staff_count"] + s["consultant_count"]
        tee.write(
            f"{s['segment']:18} "
            f"{total:>7} "
            f"{s['staff_count']:>7} "
            f"{s['consultant_count']:>11} "
            f"{s['consultant_share_pct']:>7.1f}%"
        )


def check_geography(tee: Tee, artefacts: dict[str, bytes]) -> None:
    section(tee, 5, "GEOGRAPHY (top 20)")
    tee.write("Deck reference (for eyeball):")
    tee.write("  Brussels    ~75  Geneva     ~49   Nairobi    32")
    tee.write("  New York     47  Valencia    12   Rome        20")
    tee.write("")
    if "geography.csv" not in artefacts:
        tee.write(
            "NOT PRODUCED from the reference CSV: the 8-col input lacks a "
            "`location` column."
        )
        tee.write(
            "Geography will populate only when the Lambda runs against the "
            "enriched CSV from classify_aggregator.fetch_and_classify()."
        )
        tee.write(
            "FOLLOW-UP: re-run this spot-check after the first live Lambda "
            "invocation to compare Brussels/Geneva/Nairobi counts against the deck."
        )
        return
    data = artefacts["geography.csv"].decode("utf-8")
    import csv
    import io

    reader = csv.DictReader(io.StringIO(data))
    rows = list(reader)[:20]
    tee.write(f"{'#':>3} {'LOCATION':40} {'COUNT':>6} {'SHARE':>7} {'TOP SEGMENT':>16}")
    tee.write("-" * 78)
    for i, r in enumerate(rows, 1):
        tee.write(
            f"{i:>3} {r['location_or_country'][:40]:40} "
            f"{r['count']:>6} {r['share']:>6}% {r['top_segment']:>16}"
        )


def check_grades(tee: Tee, artefacts: dict[str, bytes]) -> None:
    section(tee, 6, "GRADE DISTRIBUTION (pivot: segment × grade-band)")
    if "grade_distribution.csv" not in artefacts:
        tee.write(
            "NOT PRODUCED from the reference CSV: the 8-col input lacks a "
            "`grade_code` column. Grade bands are parsed from Supabase `level` "
            "or from the description `Level : XXX` token."
        )
        tee.write(
            "FOLLOW-UP: re-run this spot-check after the first live Lambda "
            "invocation to sanity-check grade distribution."
        )
        return
    import csv
    import io

    def bucket(code: str) -> str:
        c = (code or "null").strip().upper()
        if c in {"P-1", "P-2", "P-3", "P1", "P2", "P3"}:
            return "P1-P3"
        if c in {"P-4", "P-5", "P4", "P5"}:
            return "P4-P5"
        if c in {"D-1", "D-2", "D1", "D2"}:
            return "D1-D2"
        if c.startswith("G"):
            return "G*"
        if c.startswith("NO"):
            return "NO*"
        if c in {"CON", "ICA", "I-1", "I-2"}:
            return "Consultant/Intern"
        if c == "NULL" or not c:
            return "null"
        return f"other({c})"

    buckets = ["P1-P3", "P4-P5", "D1-D2", "G*", "NO*", "Consultant/Intern", "null", "other"]
    grid: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for r in csv.DictReader(io.StringIO(artefacts["grade_distribution.csv"].decode("utf-8"))):
        b = bucket(r["grade_code"])
        if b.startswith("other("):
            b = "other"
        grid[r["segment"]][b] += int(r["count"])

    header = f"{'SEGMENT':18}" + "".join(f"{b:>19}" for b in buckets) + f"{'TOTAL':>8}"
    tee.write(header)
    tee.write("-" * len(header))
    for seg in SEGMENT_ORDER:
        row = grid.get(seg, {})
        total = sum(row.values())
        cells = "".join(f"{row.get(b, 0):>19}" for b in buckets)
        tee.write(f"{seg:18}{cells}{total:>8}")


def check_policy_advisory_sample(tee: Tee) -> None:
    section(tee, 8, "POLICY_ADVISORY sample (20 random rows, diagnostic)")
    tee.write(
        "Purpose: eyeball whether these are legitimately digital-policy / "
        "AI-governance roles or whether generic 'Policy Officer' roles are "
        "bleeding in. Classifier is locked — do not modify."
    )
    tee.write("")

    import csv
    import random

    rows: list[dict[str, str]] = []
    with REFERENCE_CSV.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for r in reader:
            if (r.get("segment") or "").strip() == "POLICY_ADVISORY":
                rows.append(r)

    tee.write(f"Total POLICY_ADVISORY rows in reference CSV: {len(rows)}")
    tee.write("")

    rng = random.Random(42)
    sample = rng.sample(rows, min(20, len(rows)))
    sample.sort(key=lambda r: r["organization"])

    tee.write(f"{'#':>3}  {'TITLE':55} {'ORGANISATION':40} REASON")
    tee.write("-" * 140)
    for i, r in enumerate(sample, 1):
        title = (r["title"] or "")[:55]
        org = (r["organization"] or "")[:40]
        reason = r["reason"] or ""
        tee.write(f"{i:>3}  {title:55} {org:40} {reason}")


def check_cut_manifest(tee: Tee, artefacts: dict[str, bytes]) -> None:
    section(tee, 7, "CUT MANIFEST (live-run)")
    tee.write("Deck reference values:")
    tee.write("  common_source_count                       19")
    tee.write("  primary_common_sources_total_rows       5918")
    tee.write("  comparator_common_sources_total_rows    4329")
    tee.write("  source_ratio_warnings                 8 entries")
    tee.write("")
    m = json.loads(artefacts["cut_manifest.json"])
    ata = m["apples_to_apples"]
    tee.write(f"classifier_version.file_sha1            : {m['classifier_version']['file_sha1']}")
    tee.write(f"period                                   : {m['period_from']} → {m['period_to']}")
    tee.write(f"comparator                               : {m['comparator_from']} → {m['comparator_to']}")
    tee.write(f"common_source_count                      : {ata['common_source_count']}")
    tee.write(f"primary_common_sources_total_rows        : {ata['primary_common_sources_total_rows']}")
    tee.write(f"comparator_common_sources_total_rows     : {ata['comparator_common_sources_total_rows']}")
    tee.write(f"primary_common_sources_digital_rows      : {ata['primary_common_sources_digital_rows']}")
    tee.write(f"comparator_common_sources_digital_rows   : {ata['comparator_common_sources_digital_rows']}")
    tee.write(f"excluded_sources_primary_only            : {ata['excluded_sources_primary_only']}")
    tee.write(f"excluded_sources_comparator_only         : {ata['excluded_sources_comparator_only']}")
    warnings = ata.get("source_ratio_warnings", [])
    tee.write(f"source_ratio_warnings ({len(warnings)} entries):")
    for w in warnings:
        tee.write(
            f"  {w['source']:35} primary={w['primary_count']:>6}  "
            f"comparator={w['comparator_count']:>6}  ratio={w['ratio']}"
        )
    top_warnings = m.get("warnings", [])
    if top_warnings:
        tee.write("top-level warnings:")
        for w in top_warnings:
            tee.write(f"  {w}")


def main() -> int:
    tee = Tee()
    artefacts = build_all(REFERENCE_CSV, PRIMARY_PERIOD, COMPARATOR_PERIOD)
    report_header(tee, artefacts)
    check_collisions(tee, artefacts)
    check_concurrency(tee, artefacts)
    check_qoq(tee, artefacts)
    check_staff_vs_consultant(tee, artefacts)
    check_geography(tee, artefacts)
    check_grades(tee, artefacts)
    check_cut_manifest(tee, artefacts)
    check_policy_advisory_sample(tee)
    tee.dump(OUT_PATH)
    print(f"\nspot_check_output.txt written ({len(tee.lines)} lines)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
