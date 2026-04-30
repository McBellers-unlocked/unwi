"""Spot-check Q4 vs Q1 org movers from comparator_organisation_breakdown."""
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
            SELECT COUNT(*) AS rows,
                   SUM(primary_count) AS q1_total,
                   SUM(comparator_count) AS q4_total
              FROM comparator_organisation_breakdown
             WHERE snapshot_date = (
               SELECT MAX(snapshot_date) FROM comparator_organisation_breakdown
             )
            """
        )
        r = cur.fetchone()
        print(f"rows: {r[0]}  Q1 total: {r[1]}  Q4 total: {r[2]}")
        print()

        print("=== top 5 risers (Q1 - Q4) ===")
        cur.execute(
            """
            SELECT organisation, primary_count AS q1, comparator_count AS q4,
                   primary_count - comparator_count AS delta
              FROM comparator_organisation_breakdown
             WHERE snapshot_date = (
               SELECT MAX(snapshot_date) FROM comparator_organisation_breakdown
             )
             ORDER BY delta DESC NULLS LAST
             LIMIT 5
            """
        )
        for r in cur.fetchall():
            print(f"  {r[0]:<55}  Q1={r[1]:>4}  Q4={r[2]:>4}  d={r[3]:>+4}")
        print()

        print("=== top 5 fallers (Q1 - Q4) ===")
        cur.execute(
            """
            SELECT organisation, primary_count AS q1, comparator_count AS q4,
                   primary_count - comparator_count AS delta
              FROM comparator_organisation_breakdown
             WHERE snapshot_date = (
               SELECT MAX(snapshot_date) FROM comparator_organisation_breakdown
             )
             ORDER BY delta ASC
             LIMIT 5
            """
        )
        for r in cur.fetchall():
            print(f"  {r[0]:<55}  Q1={r[1]:>4}  Q4={r[2]:>4}  d={r[3]:>+4}")


if __name__ == "__main__":
    main()
