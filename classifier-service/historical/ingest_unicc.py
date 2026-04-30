"""
Append classified UNICC historical rows to reference/classified_v2_full_reference.csv.

Reads historical/unicc_historical_raw.csv (40 rows transcribed from UNICConnect
admin), applies pre-processing rules (canonical location, posted_date fallback,
contract_type -> level mapping), runs classifier_v2 over each row, and appends
to the reference CSV in the RICH_FIELDS schema. Also writes an audit CSV
recording posting_visibility, data_quality, author and original location.

Idempotent: any existing rows with id starting "unicc-hist-" are stripped from
the reference CSV before the fresh classified set is appended.

Run from the classifier-service/ directory:
    python historical/ingest_unicc.py
"""
from __future__ import annotations

import csv
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SERVICE_DIR = HERE.parent
sys.path.insert(0, str(SERVICE_DIR))

from classifier_v2 import classify  # noqa: E402
from classify_aggregator import RICH_FIELDS  # noqa: E402
from un_system import classify_scope  # noqa: E402

RAW_CSV = HERE / "unicc_historical_raw.csv"
REFERENCE_CSV = SERVICE_DIR / "reference" / "classified_v2_full_reference.csv"
AUDIT_CSV = HERE / "unicc_ingest_audit.csv"
ID_PREFIX = "unicc-hist-"

AUDIT_FIELDS = [
    "id",
    "original_posted_date",
    "used_posted_date",
    "data_quality",
    "posting_visibility",
    "author",
    "original_location",
    "canonical_location",
]


def _canonical_location(raw: str) -> str:
    """Valencia-first rule: if the multi-city string mentions Valencia,
    canonicalise to Valencia (Spain); otherwise use the first listed city.
    Single-location strings pass through unchanged."""
    raw = (raw or "").strip()
    if not raw:
        return ""
    if "," not in raw:
        return raw
    if "valencia" in raw.lower():
        return "Valencia (Spain)"
    return raw.split(",", 1)[0].strip()


def _level_from_contract_type(contract_type: str) -> str:
    """Map contract_type -> classifier-pipeline `level` token.

    build_snapshots._is_consultant (line ~600) promotes rows with
    level in {"consultant", "con", "ica"} to consultant, so consultancy
    rows must emit "consultant" verbatim to be counted in Section 07.
    """
    t = (contract_type or "").strip().lower()
    if t == "consultancy":
        return "consultant"
    if t == "internship":
        return "internship"
    return ""


def _resolve_posted_date(posted: str, last_mod: str) -> tuple[str, str]:
    """Return (used_date, data_quality). Empty posted_date falls back to
    last_modified and is flagged so the audit CSV records the substitution."""
    p = (posted or "").strip()
    m = (last_mod or "").strip()
    if p:
        return p, ""
    if m:
        return m, "modified_date_only"
    return "", "missing_both_dates"


def _load_raw_rows() -> list[dict]:
    with RAW_CSV.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        return list(reader)


def _read_existing_reference() -> list[dict]:
    """Read the reference CSV, dropping any pre-existing unicc-hist-* rows so
    the script is safe to re-run."""
    with REFERENCE_CSV.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        return [r for r in reader if not (r.get("id") or "").startswith(ID_PREFIX)]


def _reference_fieldnames() -> list[str]:
    """Preserve the reference CSV's actual header order in case it diverges
    from RICH_FIELDS (eg. an older schema)."""
    with REFERENCE_CSV.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        return list(reader.fieldnames or [])


def main() -> None:
    raw_rows = _load_raw_rows()
    if len(raw_rows) != 40:
        print(f"WARNING: expected 40 raw rows, got {len(raw_rows)}")

    existing = _read_existing_reference()
    header = _reference_fieldnames()
    if not header:
        header = list(RICH_FIELDS)

    classified_rows: list[dict] = []
    audit_rows: list[dict] = []

    for idx, raw in enumerate(raw_rows, start=1):
        role_id = f"{ID_PREFIX}{idx:03d}"
        title = (raw.get("title") or "").strip()
        org = (raw.get("organization") or "").strip()

        scope_group, _bucket, _why = classify_scope(org)
        if scope_group != "UN Common System":
            raise SystemExit(
                f"row {idx} org '{org}' not in UN Common System (got "
                f"scope_group={scope_group!r}) — aborting so we don't "
                "silently drop rows"
            )

        canonical_loc = _canonical_location(raw.get("location") or "")
        used_date, data_quality = _resolve_posted_date(
            raw.get("posted_date") or "", raw.get("last_modified") or ""
        )
        level = _level_from_contract_type(raw.get("contract_type") or "")

        seg, conf, reason = classify(
            {"title": title, "description": "", "organization": org}
        )

        out: dict[str, str] = {f: "" for f in header}
        out.update(
            {
                "id": role_id,
                "title": title,
                "organization": org,
                "source": (raw.get("source") or "").strip(),
                "segment": seg or "",
                "confidence": conf,
                "reason": reason,
                "posted_date": used_date,
                "location": canonical_loc,
                "closing_date": "",
                "source_url": "",
                "level": level,
                "description": "",
            }
        )
        classified_rows.append(out)

        audit_rows.append(
            {
                "id": role_id,
                "original_posted_date": (raw.get("posted_date") or "").strip(),
                "used_posted_date": used_date,
                "data_quality": data_quality,
                "posting_visibility": (raw.get("posting_visibility") or "").strip(),
                "author": (raw.get("author") or "").strip(),
                "original_location": (raw.get("location") or "").strip(),
                "canonical_location": canonical_loc,
            }
        )

    merged = existing + classified_rows
    with REFERENCE_CSV.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=header, extrasaction="ignore")
        w.writeheader()
        for r in merged:
            w.writerow(r)

    with AUDIT_CSV.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=AUDIT_FIELDS)
        w.writeheader()
        for r in audit_rows:
            w.writerow(r)

    seg_counts: dict[str, int] = {}
    for r in classified_rows:
        key = r["segment"] or "NOT_DIGITAL"
        seg_counts[key] = seg_counts.get(key, 0) + 1

    digital = sum(v for k, v in seg_counts.items() if k != "NOT_DIGITAL")
    print(f"wrote {len(classified_rows)} UNICC rows -> {REFERENCE_CSV}")
    print(f"audit -> {AUDIT_CSV}")
    print(f"classified digital: {digital} / {len(classified_rows)}")
    for seg, c in sorted(seg_counts.items(), key=lambda kv: -kv[1]):
        print(f"  {seg:20} {c}")


if __name__ == "__main__":
    main()
