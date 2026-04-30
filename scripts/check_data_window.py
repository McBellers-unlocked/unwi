"""Check snapshot date range + Q4 data availability for the two-tab feature."""
import json
import subprocess

import psycopg


def main() -> None:
    raw = subprocess.check_output(
        [
            "aws",
            "secretsmanager",
            "get-secret-value",
            "--secret-id",
            "unwi/aurora/writer",
            "--profile",
            "unwi",
            "--region",
            "eu-west-1",
            "--query",
            "SecretString",
            "--output",
            "text",
        ],
        text=True,
    ).strip()
    creds = json.loads(raw)

    conn = psycopg.connect(
        host="unwi-aurora.cluster-c9meyguoao54.eu-west-1.rds.amazonaws.com",
        dbname="unwi",
        user=creds["username"],
        password=creds["password"],
        sslmode="require",
    )
    with conn, conn.cursor() as cur:
        print("=== snapshots range ===")
        cur.execute(
            "SELECT MIN(snapshot_date), MAX(snapshot_date), COUNT(DISTINCT snapshot_date) FROM snapshots"
        )
        row = cur.fetchone()
        print(f"earliest: {row[0]}  latest: {row[1]}  distinct days: {row[2]}")
        print()

        print("=== distinct snapshot_dates (last 30) ===")
        cur.execute(
            "SELECT DISTINCT snapshot_date FROM snapshots ORDER BY snapshot_date DESC LIMIT 30"
        )
        for r in cur.fetchall():
            print(f"  {r[0]}")
        print()

        print("=== organisation_breakdown by snapshot_date (first 5 + last 5) ===")
        cur.execute(
            """
            SELECT snapshot_date, COUNT(*) AS rows
              FROM organisation_breakdown
             GROUP BY snapshot_date
             ORDER BY snapshot_date
            """
        )
        rows = cur.fetchall()
        if not rows:
            print("  (no rows)")
        else:
            for r in rows[:5]:
                print(f"  {r[0]}  rows={r[1]}")
            if len(rows) > 10:
                print("  ...")
            for r in rows[-5:]:
                print(f"  {r[0]}  rows={r[1]}")
        print()

        print("=== comparator_segment_shares latest row (sanity) ===")
        cur.execute(
            """
            SELECT snapshot_date, segment, primary_count, comparator_count, delta_pp
              FROM comparator_segment_shares
             WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM comparator_segment_shares)
             ORDER BY segment
            """
        )
        for r in cur.fetchall():
            print(f"  {r[0]}  {r[1]:<10}  Q1={r[2]}  Q4={r[3]}  delta_pp={r[4]}")


if __name__ == "__main__":
    main()
