"""
Pull all jobs from the aggregator API, classify with classifier_v2,
write classified_v2_full.csv.
"""
import csv
import json
import sys
import time
import urllib.request
from classifier_v2 import classify

API = "https://sjtdudezqssbmratdgmy.supabase.co/functions/v1/jobs-api"
OUT_PATH = r"C:\dev\undigitalworkforceintelligence\classified_v2_full.csv"
PER_PAGE = 500


def fetch_page(page):
    url = f"{API}?include_all=true&perPage={PER_PAGE}&page={page}"
    req = urllib.request.Request(url, headers={"User-Agent": "classifier-v2"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read())
        except Exception as e:
            print(f"  attempt {attempt + 1} failed: {e}", file=sys.stderr)
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"Failed to fetch page {page}")


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
