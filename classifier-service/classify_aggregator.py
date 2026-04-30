"""
Pull all jobs from the aggregator API, classify with classifier_v2,
write classified_v2_full.csv.

Two entry points:
  - main()                  original standalone script; keeps Windows OUT_PATH.
  - fetch_and_classify(...) Lambda-friendly: parameterised out dir; writes a
                            richer CSV that build_snapshots.py can consume
                            for geography / grade / active_roles artefacts.
"""
import csv
import json
import os
import sys
import time
import urllib.request
from pathlib import Path
from classifier_v2 import classify
from un_system import classify_scope, whitelist_size

API = "https://sjtdudezqssbmratdgmy.supabase.co/functions/v1/jobs-api"
OUT_PATH = r"C:\dev\undigitalworkforceintelligence\classified_v2_full.csv"
PER_PAGE = 500

RICH_FIELDS = [
    "id",
    "title",
    "organization",
    "source",
    "segment",
    "confidence",
    "reason",
    "posted_date",
    "location",
    "closing_date",
    "source_url",
    "level",
    "description",
    "scope_group",
    "scope_bucket",
]


def fetch_page(page, api_url=API, per_page=PER_PAGE):
    url = f"{api_url}?include_all=true&perPage={per_page}&page={page}"
    req = urllib.request.Request(url, headers={"User-Agent": "classifier-v2"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read())
        except Exception as e:
            print(f"  attempt {attempt + 1} failed: {e}", file=sys.stderr)
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"Failed to fetch page {page}")


def fetch_and_classify(out_dir, api_url=API, per_page=PER_PAGE):
    """Fetch all postings, classify, write rich CSV with scope_group tagging.

    Every fetched row is written. Rows from orgs in any tracked scope group
    (UN Common System, Bretton Woods, Regional Development Banks, European
    Union, Other International Organisations) are tagged accordingly; rows
    from untracked orgs are skipped (kept out of all aggregates).

    Existing UN-only aggregates filter at aggregate time (build_snapshots),
    so adding partner data does not pollute the UN sections; partner data
    surfaces only via the new scope_breakdown artefact.

    Returns (classified_csv_path, rows_fetched, rows_classified, scope_filter).
    scope_filter is a dict embedded into cut_manifest so the filter is auditable.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "classified_v2_full.csv"

    page = 1
    n_total = 0
    n_kept = 0
    n_un = 0
    n_partner = 0
    n_no_scope = 0
    n_digital_un = 0
    with out_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=RICH_FIELDS, extrasaction="ignore")
        w.writeheader()
        while True:
            data = fetch_page(page, api_url=api_url, per_page=per_page)
            items = data.get("items", [])
            if not items:
                break
            for row in items:
                n_total += 1
                org = row.get("organization") or ""
                scope_group, bucket, _reason = classify_scope(org)
                if scope_group is None:
                    n_no_scope += 1
                    continue
                n_kept += 1
                if scope_group == "UN Common System":
                    n_un += 1
                else:
                    n_partner += 1
                seg, conf, reason = classify(
                    {
                        "title": row.get("title") or "",
                        "description": row.get("description") or "",
                        "organization": org,
                    }
                )
                if seg and scope_group == "UN Common System":
                    n_digital_un += 1
                w.writerow(
                    {
                        "id": row.get("id", ""),
                        "title": row.get("title", ""),
                        "organization": org,
                        "source": row.get("source", ""),
                        "segment": seg or "",
                        "confidence": conf,
                        "reason": reason,
                        "posted_date": row.get("posted_date", ""),
                        "location": row.get("location", "") or row.get("duty_station", ""),
                        "closing_date": row.get("closing_date", "") or row.get("deadline", ""),
                        "source_url": row.get("source_url", "") or row.get("url", ""),
                        "level": row.get("level", "") or row.get("grade", ""),
                        "description": row.get("description", "") or "",
                        "scope_group": scope_group,
                        "scope_bucket": bucket or "",
                    }
                )
            if not data.get("hasMore"):
                break
            page += 1

    scope_filter = {
        "type": "multi_scope_whitelist",
        "whitelist_size": whitelist_size(),
        # Kept for backward compat — UN-Common-System counts equivalent to
        # the previous in/out figures.
        "filtered_in_rows": n_un,
        "filtered_out_rows": n_no_scope + n_partner,
        # New: full scope breakdown.
        "rows_kept_total": n_kept,
        "rows_un_common_system": n_un,
        "rows_partner_groups": n_partner,
        "rows_untracked": n_no_scope,
    }
    # Existing rows_classified (n_digital) is the UN-Common-System digital
    # count — the apples-to-apples figure for all the UN-flavoured aggregates.
    return out_path, n_total, n_digital_un, scope_filter


def main():
    page = 1
    fields = ["id", "title", "organization", "source", "segment",
              "confidence", "reason", "posted_date"]
    n_total = 0
    n_digital = 0
    seg_counts = {}
    with open(OUT_PATH, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        while True:
            print(f"Fetching page {page}...")
            data = fetch_page(page)
            items = data.get("items", [])
            if not items:
                break
            for row in items:
                n_total += 1
                seg, conf, reason = classify({
                    "title": row.get("title") or "",
                    "description": row.get("description") or "",
                    "organization": row.get("organization") or "",
                })
                if seg:
                    n_digital += 1
                    seg_counts[seg] = seg_counts.get(seg, 0) + 1
                w.writerow({
                    "id": row.get("id", ""),
                    "title": row.get("title", ""),
                    "organization": row.get("organization", ""),
                    "source": row.get("source", ""),
                    "segment": seg or "",
                    "confidence": conf,
                    "reason": reason,
                    "posted_date": row.get("posted_date", ""),
                })
            if not data.get("hasMore"):
                break
            page += 1
    print()
    print(f"Total jobs classified: {n_total}")
    print(f"Digital (any segment): {n_digital}  ({100.0 * n_digital / n_total:.1f}%)")
    print()
    for seg in sorted(seg_counts, key=lambda s: -seg_counts[s]):
        print(f"  {seg:18} {seg_counts[seg]}")
    print()
    print(f"Written: {OUT_PATH}")
    return n_total, n_digital, seg_counts


if __name__ == "__main__":
    main()
