"""
Build the 12 snapshot artefacts from a classified CSV.

Deterministic. No network. Given the same classified CSV and the same period
definitions, the output is byte-for-byte identical.

Required columns in the input CSV:
    id, title, organization, source, segment, confidence, reason, posted_date

Optional columns (when present, enables richer artefacts):
    location          (→ geography.csv)
    grade_code        (→ grade_distribution.csv)
    level             (→ staff_vs_consultant.json, more accurate than title-parsing)
    description       (lets us derive location/grade when missing from top level)
    closing_date      (→ active_roles.csv)
    source_url        (→ active_roles.csv)

Period constants are exposed on the module so the Lambda handler can override
them if we ever rewind a snapshot.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import re
import sys

# UN aggregator job descriptions occasionally exceed Python's default per-field
# CSV limit (131072 bytes). Lift the cap — the rows still fit comfortably in
# Lambda memory.
csv.field_size_limit(min(sys.maxsize, 2**31 - 1))
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Iterable


ANCHOR_DATE = date(2025, 8, 1)
PRIMARY_PERIOD = (date(2026, 1, 1), date(2026, 3, 31))
COMPARATOR_PERIOD = (date(2025, 10, 1), date(2025, 12, 31))

# Rolling-window sizes for Section 02. A row is in window W if its posted_date
# is in (snapshot_date - W, snapshot_date]. The Lambda passes its actual
# snapshot date; dry-run / CLI mode falls back to max(posted_date) so the
# reference fixture (dated Jan-Apr 2026) produces non-empty aggregates.
WINDOW_DAYS: tuple[int, ...] = (30, 60, 90)

# Sources explicitly excluded from the apples-to-apples QoQ comparison even
# when they appear in both primary and comparator periods. UNICC was absent
# from the Supabase feed until Q1 2026 and was backfilled manually from
# UNICConnect; including it in QoQ would conflate ingest-coverage changes
# with real hiring-mix shifts. Section 03 cites this exclusion in its
# methodology caveat.
COMPARATOR_EXCLUDE_SOURCES: set[str] = {"unicc:uniqtalent"}

SEGMENT_ORDER = [
    "CYBER",
    "DATA_AI",
    "SOFTWARE",
    "CLOUD",
    "ENTERPRISE",
    "INFO_KM",
    "PRODUCT",
    "POLICY_ADVISORY",
    "ITOPS",
]

ARTEFACT_NAMES = [
    "headline_numbers.json",
    "segment_distribution.csv",
    "organisation_breakdown.csv",
    "geography.csv",
    "grade_distribution.csv",
    "source_coverage.csv",
    "comparator_segment_shares.csv",
    "concurrency_timeseries.json",
    "qoq_change.json",
    "collision_profiles.json",
    "staff_vs_consultant.json",
    "since_aug_aggregates.json",
    "cut_manifest.json",
    "segment_window_aggregates.csv",
]


@dataclass
class Row:
    id: str
    title: str
    organization: str
    source: str
    segment: str | None
    confidence: str
    reason: str
    posted_date: date | None
    location: str | None
    grade_code: str | None
    level: str | None
    description: str | None
    closing_date: date | None
    source_url: str | None


def _parse_date(s: str | None) -> date | None:
    if not s:
        return None
    try:
        return datetime.strptime(s.strip()[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def _derive_grade_from_description(desc: str) -> str | None:
    """Extract 'Level : XXX' from un-careers description blobs."""
    if not desc:
        return None
    m = re.search(r"Level\s*:\s*([A-Z0-9\-]+)", desc)
    if m:
        return m.group(1)
    return None


def _derive_location_from_description(desc: str) -> str | None:
    """Extract 'Duty Station : XXX' from un-careers description blobs."""
    if not desc:
        return None
    m = re.search(r"Duty Station\s*:\s*([^\n<]+?)(?:\s{2,}|$|Staffing|<)", desc)
    if m:
        return m.group(1).strip()
    return None


def load_rows(csv_path: Path) -> list[Row]:
    rows: list[Row] = []
    with csv_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for r in reader:
            seg = (r.get("segment") or "").strip() or None
            desc = r.get("description") or None
            loc = (r.get("location") or "").strip() or None
            grade = (r.get("grade_code") or "").strip() or None
            if desc:
                if not loc:
                    loc = _derive_location_from_description(desc)
                if not grade:
                    grade = _derive_grade_from_description(desc)
            rows.append(
                Row(
                    id=r.get("id") or "",
                    title=r.get("title") or "",
                    organization=r.get("organization") or "",
                    source=r.get("source") or "",
                    segment=seg if seg else None,
                    confidence=r.get("confidence") or "",
                    reason=r.get("reason") or "",
                    posted_date=_parse_date(r.get("posted_date")),
                    location=loc,
                    grade_code=grade,
                    level=(r.get("level") or "").strip() or None,
                    description=desc,
                    closing_date=_parse_date(r.get("closing_date")),
                    source_url=(r.get("source_url") or "").strip() or None,
                )
            )
    return rows


def _in_period(d: date | None, period: tuple[date, date]) -> bool:
    return d is not None and period[0] <= d <= period[1]


def _round2(x: float) -> float:
    return round(x, 2)


def _pct(numerator: float, denominator: float) -> float:
    if denominator == 0:
        return 0.0
    return _round2(100.0 * numerator / denominator)


def _classifier_sha() -> str:
    """SHA-1 of classifier_v2.py file bytes — matches the reference manifest style."""
    here = Path(__file__).parent
    target = here / "classifier_v2.py"
    if not target.exists():
        return "unknown"
    h = hashlib.sha1()
    with target.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


# -----------------------------------------------------------------------------
# Artefact builders — each returns bytes.
# -----------------------------------------------------------------------------

def build_headline_numbers(
    rows: list[Row],
    primary: tuple[date, date],
    comparator: tuple[date, date],
) -> bytes:
    primary_rows = [r for r in rows if _in_period(r.posted_date, primary)]
    comp_rows = [r for r in rows if _in_period(r.posted_date, comparator)]

    total = len(primary_rows)
    digital_rows = [r for r in primary_rows if r.segment]
    digital = len(digital_rows)

    seg_counts = Counter(r.segment for r in digital_rows)
    seg_shares = {s: _pct(seg_counts.get(s, 0), digital) for s in SEGMENT_ORDER}

    orgs = {r.organization for r in digital_rows if r.organization}

    primary_sources = {r.source for r in primary_rows if r.source}
    comp_sources = {r.source for r in comp_rows if r.source}
    common_sources = (primary_sources & comp_sources) - COMPARATOR_EXCLUDE_SOURCES

    apples_primary = [r for r in primary_rows if r.source in common_sources]
    apples_comp = [r for r in comp_rows if r.source in common_sources]
    apples_primary_digital = [r for r in apples_primary if r.segment]
    apples_comp_digital = [r for r in apples_comp if r.segment]

    primary_apples_counts = Counter(r.segment for r in apples_primary_digital)
    primary_apples_total = len(apples_primary_digital)
    primary_shares_apples = {
        s: _pct(primary_apples_counts.get(s, 0), primary_apples_total)
        for s in SEGMENT_ORDER
    }

    comp_counts = Counter(r.segment for r in apples_comp_digital)
    comp_total = len(apples_comp_digital)
    comp_shares = {
        s: _pct(comp_counts.get(s, 0), comp_total) for s in SEGMENT_ORDER
    }

    composition_stable = all(
        abs(primary_shares_apples[s] - comp_shares[s]) < 3.0
        for s in SEGMENT_ORDER
    )

    payload = {
        "period_from": primary[0].isoformat(),
        "period_to": primary[1].isoformat(),
        "total_postings": total,
        "digital_postings": digital,
        "digital_share_pct": _pct(digital, total),
        "segment_counts": {s: seg_counts.get(s, 0) for s in SEGMENT_ORDER},
        "segment_shares_pct": seg_shares,
        "organisations_represented": len(orgs),
        "comparator_period": {
            "from": comparator[0].isoformat(),
            "to": comparator[1].isoformat(),
        },
        "comparator_total_postings": len(comp_rows),
        "comparator_digital_postings": len([r for r in comp_rows if r.segment]),
        "comparator_digital_share_pct": _pct(
            len([r for r in comp_rows if r.segment]), len(comp_rows)
        ),
        "primary_shares_pct_apples_to_apples": primary_shares_apples,
        "comparator_shares_pct": comp_shares,
        "composition_stable": composition_stable,
    }
    return json.dumps(payload, indent=2).encode("utf-8") + b"\n"


def _csv_bytes(headers: list[str], rows: list[list[Any]]) -> bytes:
    buf = io.StringIO()
    w = csv.writer(buf, quoting=csv.QUOTE_MINIMAL, lineterminator="\n")
    w.writerow(headers)
    for r in rows:
        w.writerow(r)
    return buf.getvalue().encode("utf-8")


def build_segment_distribution(
    rows: list[Row], primary: tuple[date, date]
) -> bytes:
    primary_rows = [r for r in rows if _in_period(r.posted_date, primary)]
    total = len(primary_rows)
    digital_rows = [r for r in primary_rows if r.segment]
    digital_total = len(digital_rows)
    seg_counts = Counter(r.segment for r in digital_rows)
    non_digital = total - digital_total

    out: list[list[Any]] = []
    for s in SEGMENT_ORDER:
        c = seg_counts.get(s, 0)
        out.append(
            [
                s,
                c,
                _pct(c, digital_total),
                _pct(c, total),
            ]
        )
    out.append(["NOT_DIGITAL", non_digital, "", _pct(non_digital, total)])
    return _csv_bytes(["segment", "count", "share_of_digital", "share_of_all"], out)


def build_organisation_breakdown(
    rows: list[Row], primary: tuple[date, date]
) -> bytes:
    primary_rows = [r for r in rows if _in_period(r.posted_date, primary)]
    by_org: dict[str, list[Row]] = defaultdict(list)
    for r in primary_rows:
        if r.organization:
            by_org[r.organization].append(r)

    records = []
    for org, group in by_org.items():
        total = len(group)
        digital = [r for r in group if r.segment]
        if not digital:
            continue
        seg_counts = Counter(r.segment for r in digital)
        top = [s for s, _ in seg_counts.most_common(3)]
        while len(top) < 3:
            top.append("")
        records.append(
            (
                org,
                total,
                len(digital),
                _pct(len(digital), total),
                top[0],
                top[1],
                top[2],
            )
        )

    records.sort(key=lambda r: (-r[2], r[0]))
    return _csv_bytes(
        [
            "organisation",
            "total_postings",
            "digital_postings",
            "digital_share",
            "top_segment_1",
            "top_segment_2",
            "top_segment_3",
        ],
        [list(r) for r in records],
    )


def _geography_by_location(
    rows: list[Row], primary: tuple[date, date]
) -> dict[str, dict[str, Any]]:
    """Per-location aggregates consumed by build_geography (CSV) and the
    handler's Aurora write (JSONB top_segments column)."""
    primary_rows = [
        r for r in rows if _in_period(r.posted_date, primary) and r.location
    ]
    digital_rows = [r for r in primary_rows if r.segment]
    digital_total = len(digital_rows)

    by_loc: dict[str, list[Row]] = defaultdict(list)
    for r in digital_rows:
        by_loc[r.location].append(r)

    out: dict[str, dict[str, Any]] = {}
    for loc, group in by_loc.items():
        count = len(group)
        seg_counts = Counter(r.segment for r in group)
        top3 = [s for s, _ in seg_counts.most_common(3)]
        orgs = sorted({r.organization for r in group if r.organization})
        out[loc] = {
            "count": count,
            "share": _pct(count, digital_total),
            "top_segments": top3,
            "organisations": orgs,
        }
    return out


def build_geography(rows: list[Row], primary: tuple[date, date]) -> bytes:
    """CSV schema matches the reference (4 columns). Per-location top-3 and
    org list are exposed via _geography_by_location for the DB write path."""
    data = _geography_by_location(rows, primary)
    records = sorted(
        (
            (loc, d["count"], d["share"], d["top_segments"][0] if d["top_segments"] else "")
            for loc, d in data.items()
        ),
        key=lambda r: (-r[1], r[0]),
    )
    return _csv_bytes(
        ["location_or_country", "count", "share", "top_segment"],
        [list(r) for r in records],
    )


def build_grade_distribution(
    rows: list[Row], primary: tuple[date, date]
) -> bytes:
    primary_rows = [
        r for r in rows if _in_period(r.posted_date, primary) and r.segment
    ]
    digital_total = len(primary_rows)
    counter: Counter[tuple[str | None, str]] = Counter()
    for r in primary_rows:
        counter[(r.grade_code, r.segment)] += 1

    records = []
    for (grade, seg), count in counter.items():
        records.append(
            (grade if grade else "null", seg, count, _pct(count, digital_total))
        )
    records.sort(key=lambda r: (-r[2], r[0], r[1]))
    return _csv_bytes(
        ["grade_code", "segment", "count", "share"],
        [list(r) for r in records],
    )


def build_source_coverage(rows: list[Row], primary: tuple[date, date]) -> bytes:
    primary_rows = [r for r in rows if _in_period(r.posted_date, primary)]
    digital_total = len([r for r in primary_rows if r.segment])

    by_src: dict[str, list[Row]] = defaultdict(list)
    for r in primary_rows:
        if r.source:
            by_src[r.source].append(r)

    records = []
    for src, group in by_src.items():
        total = len(group)
        digital = len([r for r in group if r.segment])
        records.append((src, total, digital, _pct(digital, digital_total)))

    records.sort(key=lambda r: (-r[1], r[0]))
    return _csv_bytes(
        ["source", "total_count", "digital_count", "share_of_digital"],
        [list(r) for r in records],
    )


def build_comparator_segment_shares(
    rows: list[Row],
    primary: tuple[date, date],
    comparator: tuple[date, date],
) -> bytes:
    primary_rows = [r for r in rows if _in_period(r.posted_date, primary)]
    comp_rows = [r for r in rows if _in_period(r.posted_date, comparator)]

    primary_sources = {r.source for r in primary_rows if r.source}
    comp_sources = {r.source for r in comp_rows if r.source}
    common_sources = (primary_sources & comp_sources) - COMPARATOR_EXCLUDE_SOURCES

    apples_primary = [
        r for r in primary_rows if r.segment and r.source in common_sources
    ]
    apples_comp = [
        r for r in comp_rows if r.segment and r.source in common_sources
    ]

    pc = Counter(r.segment for r in apples_primary)
    cc = Counter(r.segment for r in apples_comp)
    pt = sum(pc.values())
    ct = sum(cc.values())

    out = []
    for s in SEGMENT_ORDER:
        p = pc.get(s, 0)
        c = cc.get(s, 0)
        ps = _pct(p, pt)
        cs = _pct(c, ct)
        out.append([s, p, ps, c, cs, _round2(ps - cs)])
    return _csv_bytes(
        [
            "segment",
            "primary_count",
            "primary_share",
            "comparator_count",
            "comparator_share",
            "delta_pp",
        ],
        out,
    )


def build_since_aug_aggregates(
    rows: list[Row],
    anchor: date = ANCHOR_DATE,
) -> bytes:
    """Aggregates over postings posted on or after the Aug 1 2025 anchor.

    Mirrors segment_distribution / organisation_breakdown / geography but
    spans the wider 'since August' window — drives the dashboard's
    Since-August tab. The Q1-period builders above intentionally keep their
    narrower scope so the Q1 cut stays apples-to-apples with Q4.
    """
    in_window = [r for r in rows if r.posted_date and r.posted_date >= anchor]
    digital = [r for r in in_window if r.segment]
    total_postings = len(in_window)
    digital_total = len(digital)

    seg_counts = Counter(r.segment for r in digital)
    segments = [
        {
            "segment": s,
            "count": seg_counts.get(s, 0),
            "share_of_digital": _pct(seg_counts.get(s, 0), digital_total),
        }
        for s in SEGMENT_ORDER
    ]

    by_org: dict[str, list[Row]] = defaultdict(list)
    for r in in_window:
        if r.organization:
            by_org[r.organization].append(r)
    organisations: list[dict[str, Any]] = []
    for org, group in by_org.items():
        digital_group = [x for x in group if x.segment]
        if not digital_group:
            continue
        seg_counter = Counter(x.segment for x in digital_group)
        top = [s for s, _ in seg_counter.most_common(3)]
        while len(top) < 3:
            top.append(None)
        organisations.append(
            {
                "organisation": org,
                "total_postings": len(group),
                "digital_postings": len(digital_group),
                "digital_share": _pct(len(digital_group), len(group)),
                "top_segment_1": top[0],
                "top_segment_2": top[1],
                "top_segment_3": top[2],
            }
        )
    organisations.sort(key=lambda r: (-r["digital_postings"], r["organisation"]))

    by_loc: dict[str, list[Row]] = defaultdict(list)
    for r in digital:
        if r.location:
            by_loc[r.location].append(r)
    geography_rows: list[dict[str, Any]] = []
    for loc, group in by_loc.items():
        seg_counter = Counter(r.segment for r in group)
        top3 = [s for s, _ in seg_counter.most_common(3)]
        orgs = sorted({r.organization for r in group if r.organization})
        geography_rows.append(
            {
                "location_or_country": loc,
                "count": len(group),
                "share": _pct(len(group), digital_total),
                "top_segment": top3[0] if top3 else None,
                "top_segments": top3,
                "organisation_count": len(orgs),
            }
        )
    geography_rows.sort(key=lambda r: (-r["count"], r["location_or_country"]))

    posted_dates = [r.posted_date for r in in_window if r.posted_date]
    period_to = max(posted_dates).isoformat() if posted_dates else anchor.isoformat()

    payload = {
        "period": {
            "from": anchor.isoformat(),
            "to": period_to,
        },
        "totals": {
            "total_postings": total_postings,
            "digital_postings": digital_total,
            "digital_share_pct": _pct(digital_total, total_postings),
            "organisations_represented": sum(
                1 for o in organisations if o["digital_postings"] > 0
            ),
            "duty_stations_represented": len(geography_rows),
        },
        "segments": segments,
        "organisations": organisations,
        "geography": geography_rows,
    }
    return json.dumps(payload, indent=2).encode("utf-8") + b"\n"


def build_concurrency_timeseries(
    rows: list[Row],
    primary: tuple[date, date] = PRIMARY_PERIOD,
    from_month: str = "2025-08",
) -> bytes:
    """Distinct-organisation concurrency per segment per month.

    Drops partial months past the primary period end so trailing months (e.g.
    2026-04 when the primary period closes 2026-03-31) don't bias peaks.
    """
    from calendar import monthrange

    from_year, from_mon = map(int, from_month.split("-"))
    start = date(from_year, from_mon, 1)
    primary_end = primary[1]

    def month_end(y: int, m: int) -> date:
        return date(y, m, monthrange(y, m)[1])

    by_seg_month: dict[str, dict[str, set[str]]] = defaultdict(
        lambda: defaultdict(set)
    )
    for r in rows:
        if not r.segment or not r.posted_date or r.posted_date < start:
            continue
        if month_end(r.posted_date.year, r.posted_date.month) > primary_end:
            continue
        key = f"{r.posted_date.year:04d}-{r.posted_date.month:02d}"
        by_seg_month[r.segment][key].add(r.organization)

    months_seen = sorted(
        {m for seg in by_seg_month for m in by_seg_month[seg]}
    )
    payload = {
        "segments": [
            {
                "segment": s,
                "points": [
                    {
                        "month": m,
                        "distinct_organisations": len(by_seg_month[s].get(m, set())),
                    }
                    for m in months_seen
                ],
            }
            for s in SEGMENT_ORDER
        ]
    }
    return json.dumps(payload, indent=2).encode("utf-8") + b"\n"


def build_qoq_change(
    rows: list[Row],
    primary: tuple[date, date],
    comparator: tuple[date, date],
) -> bytes:
    primary_digital = Counter(
        r.segment for r in rows if _in_period(r.posted_date, primary) and r.segment
    )
    comp_digital = Counter(
        r.segment for r in rows if _in_period(r.posted_date, comparator) and r.segment
    )
    segments = []
    for s in SEGMENT_ORDER:
        p = primary_digital.get(s, 0)
        c = comp_digital.get(s, 0)
        delta_pct = _pct(p - c, c) if c else 0.0
        segments.append(
            {
                "segment": s,
                "primary_count": p,
                "comparator_count": c,
                "delta_abs": p - c,
                "delta_pct": delta_pct,
            }
        )
    return json.dumps({"segments": segments}, indent=2).encode("utf-8") + b"\n"


def _normalize_title(t: str) -> str:
    """Canonicalise titles for collision detection.

    Keeps role nouns ("Analyst", "Officer", "Scientist") — they are signal, not
    noise. Strips only: location suffix after a comma, bracket punctuation, and
    UN grade-code tokens (P-1..P-5, D-1..D-2, G-1..G-7).
    """
    t = t.lower()
    if "," in t:
        t = t.split(",", 1)[0]
    t = re.sub(r"[\(\)\[\]]", " ", t)
    t = re.sub(r"[^a-z0-9\s\-\/]", " ", t)
    t = re.sub(r"\b[pd]\s*-?\s*[1-5]\b", " ", t)
    t = re.sub(r"\bg\s*-?\s*[1-7]\b", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def build_collision_profiles(
    rows: list[Row], primary: tuple[date, date]
) -> bytes:
    primary_digital = [
        r for r in rows if _in_period(r.posted_date, primary) and r.segment
    ]
    by_title: dict[tuple[str, str], Counter[str]] = defaultdict(Counter)
    seg_of: dict[tuple[str, str], str] = {}
    for r in primary_digital:
        canonical = _normalize_title(r.title)
        if not canonical:
            continue
        key = (canonical, r.segment)
        by_title[key][r.organization] += 1
        seg_of[key] = r.segment

    profiles = []
    for (canonical, seg), counter in by_title.items():
        if len(counter) >= 3:
            profiles.append(
                {
                    "canonical_title": canonical,
                    "organisation_count": len(counter),
                    "organisations": sorted(counter),
                    "posting_counts": dict(counter),
                    "segment": seg,
                }
            )
    profiles.sort(key=lambda p: (-p["organisation_count"], p["canonical_title"]))
    return json.dumps({"profiles": profiles}, indent=2).encode("utf-8") + b"\n"


def _is_consultant(row: Row) -> bool:
    if row.level and row.level.strip().lower() in {"consultant", "con", "ica"}:
        return True
    if row.grade_code and row.grade_code.strip().upper() in {"CON", "ICA"}:
        return True
    t = row.title.lower()
    return any(
        kw in t
        for kw in ("consultant", "consultancy", "contractor", "individual contractor")
    )


def build_staff_vs_consultant(
    rows: list[Row], primary: tuple[date, date]
) -> bytes:
    primary_digital = [
        r for r in rows if _in_period(r.posted_date, primary) and r.segment
    ]
    by_seg_flag: dict[str, Counter[str]] = defaultdict(Counter)
    for r in primary_digital:
        flag = "consultant" if _is_consultant(r) else "staff"
        by_seg_flag[r.segment][flag] += 1

    segments = []
    for s in SEGMENT_ORDER:
        c = by_seg_flag[s].get("consultant", 0)
        st = by_seg_flag[s].get("staff", 0)
        total = c + st
        segments.append(
            {
                "segment": s,
                "staff_count": st,
                "consultant_count": c,
                "consultant_share_pct": _pct(c, total),
            }
        )
    return json.dumps({"segments": segments}, indent=2).encode("utf-8") + b"\n"


def build_segment_window_aggregates(
    rows: list[Row],
    snapshot_date: date,
    windows: tuple[int, ...] = WINDOW_DAYS,
) -> bytes:
    """Per-window per-segment role + distinct-org counts.

    A row belongs to window W if its posted_date is in
    (snapshot_date - W, snapshot_date]. Excludes NOT_DIGITAL (i.e. rows with
    no segment). Zero-fills (W, segment) pairs with no rows so the reader
    never sees missing segments.
    """
    digital_rows = [
        r for r in rows if r.segment and r.posted_date is not None
    ]
    out: list[list[Any]] = []
    for w in windows:
        floor = snapshot_date - timedelta(days=w)
        in_window = [
            r for r in digital_rows
            if floor < r.posted_date <= snapshot_date
        ]
        by_seg: dict[str, list[Row]] = defaultdict(list)
        for r in in_window:
            by_seg[r.segment].append(r)
        for s in SEGMENT_ORDER:
            group = by_seg.get(s, [])
            role_count = len(group)
            org_count = len({r.organization for r in group if r.organization})
            out.append([snapshot_date.isoformat(), w, s, role_count, org_count])
    return _csv_bytes(
        ["snapshot_date", "window_days", "segment", "role_count", "org_count"],
        out,
    )


def build_cut_manifest(
    rows: list[Row],
    primary: tuple[date, date],
    comparator: tuple[date, date],
    cut_generated_at: str | None = None,
    scope_filter: dict | None = None,
) -> bytes:
    primary_rows = [r for r in rows if _in_period(r.posted_date, primary)]
    comp_rows = [r for r in rows if _in_period(r.posted_date, comparator)]
    primary_sources = {r.source for r in primary_rows if r.source}
    comp_sources = {r.source for r in comp_rows if r.source}
    common = (primary_sources & comp_sources) - COMPARATOR_EXCLUDE_SOURCES
    excluded_by_policy = sorted(
        COMPARATOR_EXCLUDE_SOURCES & (primary_sources & comp_sources)
    )
    only_primary = sorted(primary_sources - comp_sources)
    only_comp = sorted(comp_sources - primary_sources)

    by_src_primary = Counter(r.source for r in primary_rows if r.source in common)
    by_src_comp = Counter(r.source for r in comp_rows if r.source in common)

    warnings = []
    for src in sorted(common):
        p = by_src_primary.get(src, 0)
        c = by_src_comp.get(src, 0)
        if c == 0 or p == 0:
            continue
        ratio = max(p, c) / max(1, min(p, c))
        if ratio >= 2.0:
            warnings.append(
                {
                    "source": src,
                    "primary_count": p,
                    "comparator_count": c,
                    "ratio": round(max(p, c) / min(p, c), 2),
                }
            )

    payload = {
        "cut_generated_at": cut_generated_at or datetime.utcnow().isoformat(timespec="seconds") + "+00:00",
        "classifier_version": {
            "file_sha1": _classifier_sha(),
        },
        # scope_filter is populated by the Lambda handler (empty in dry-run).
        # Expected keys: type, whitelist_size, filtered_in_rows, filtered_out_rows.
        "scope_filter": scope_filter or {"type": "none", "filtered_in_rows": None, "filtered_out_rows": None},
        "period_from": primary[0].isoformat(),
        "period_to": primary[1].isoformat(),
        "comparator_from": comparator[0].isoformat(),
        "comparator_to": comparator[1].isoformat(),
        "apples_to_apples": {
            "common_sources": sorted(common),
            "common_source_count": len(common),
            "excluded_by_policy": excluded_by_policy,
            "excluded_sources_primary_only": only_primary,
            "excluded_sources_comparator_only": only_comp,
            "primary_common_sources_total_rows": sum(by_src_primary.values()),
            "comparator_common_sources_total_rows": sum(by_src_comp.values()),
            "primary_common_sources_digital_rows": len(
                [r for r in primary_rows if r.source in common and r.segment]
            ),
            "comparator_common_sources_digital_rows": len(
                [r for r in comp_rows if r.source in common and r.segment]
            ),
            "source_ratio_warnings": warnings,
        },
        "warnings": [],
    }
    return json.dumps(payload, indent=2).encode("utf-8") + b"\n"


def build_all(
    csv_path: Path,
    primary: tuple[date, date] = PRIMARY_PERIOD,
    comparator: tuple[date, date] = COMPARATOR_PERIOD,
    cut_generated_at: str | None = None,
    scope_filter: dict | None = None,
    snapshot_date: date | None = None,
) -> dict[str, bytes]:
    rows = load_rows(csv_path)
    has_location = any(r.location for r in rows)
    has_grade = any(r.grade_code for r in rows)

    # Rolling-window aggregates anchor on snapshot_date. In Lambda this is
    # today's UTC date. In dry-run / CLI mode (where today's date sits past
    # the reference fixture's posted_date range), fall back to the latest
    # posted_date in the input so windows aren't empty.
    if snapshot_date is None:
        posted_dates = [r.posted_date for r in rows if r.posted_date]
        snapshot_date = max(posted_dates) if posted_dates else date.today()

    out = {
        "headline_numbers.json": build_headline_numbers(rows, primary, comparator),
        "segment_distribution.csv": build_segment_distribution(rows, primary),
        "organisation_breakdown.csv": build_organisation_breakdown(rows, primary),
        "source_coverage.csv": build_source_coverage(rows, primary),
        "comparator_segment_shares.csv": build_comparator_segment_shares(
            rows, primary, comparator
        ),
        "concurrency_timeseries.json": build_concurrency_timeseries(rows, primary),
        "qoq_change.json": build_qoq_change(rows, primary, comparator),
        "collision_profiles.json": build_collision_profiles(rows, primary),
        "staff_vs_consultant.json": build_staff_vs_consultant(rows, primary),
        "since_aug_aggregates.json": build_since_aug_aggregates(rows),
        "cut_manifest.json": build_cut_manifest(
            rows, primary, comparator, cut_generated_at, scope_filter=scope_filter,
        ),
        "segment_window_aggregates.csv": build_segment_window_aggregates(
            rows, snapshot_date,
        ),
    }
    if has_location:
        out["geography.csv"] = build_geography(rows, primary)
    if has_grade:
        out["grade_distribution.csv"] = build_grade_distribution(rows, primary)
    return out


if __name__ == "__main__":
    import sys

    csv_in = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("reference/classified_v2_full_reference.csv")
    out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("out")
    out_dir.mkdir(parents=True, exist_ok=True)
    artefacts = build_all(csv_in)
    for name, data in artefacts.items():
        (out_dir / name).write_bytes(data)
    print(f"wrote {len(artefacts)} artefacts to {out_dir}/")
