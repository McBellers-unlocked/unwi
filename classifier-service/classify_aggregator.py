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
    """Fetch all postings from the aggregator API, classify, write rich CSV.

    Returns (classified_csv_path, rows_fetched, rows_classified).
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "classified_v2_full.csv"

    page = 1
    n_total = 0
    n_digital = 0
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
                seg, conf, reason = classify(
                    {
                        "title": row.get("title") or "",
                        "description": row.get("description") or "",
                        "organization": row.get("organization") or "",
                    }
                )
                if seg:
                    n_digital += 1
                w.writerow(
                    {
                        "id": row.get("id", ""),
                        "title": row.get("title", ""),
                        "organization": row.get("organization", ""),
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
                    }
                )
            if not data.get("hasMore"):
                break
            page += 1
    return out_path, n_total, n_digital


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
