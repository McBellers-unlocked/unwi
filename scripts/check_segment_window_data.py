"""Spot-check segment_window_aggregates rows for the latest snapshot."""
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
        cur.execute(
            """
            SELECT window_days, COUNT(*) AS rows, SUM(role_count) AS roles, SUM(org_count) AS orgs
              FROM segment_window_aggregates
             WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM segment_window_aggregates)
             GROUP BY window_days
             ORDER BY window_days
            """
        )
        rows = cur.fetchall()
        if not rows:
            print("(no rows)")
            return
        print(f"{'window':>8}  {'rows':>5}  {'roles':>6}  {'orgs':>6}")
        for r in rows:
            print(f"{r[0]:>6}d  {r[1]:>5}  {r[2]:>6}  {r[3]:>6}")


if __name__ == "__main__":
    main()
