"""Verify since_aug_aggregates was populated by the latest classifier run."""
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
            SELECT snapshot_date,
                   since_aug_aggregates IS NULL                           AS is_null,
                   since_aug_aggregates->'period'->>'from'                AS period_from,
                   since_aug_aggregates->'period'->>'to'                  AS period_to,
                   since_aug_aggregates->'totals'->>'total_postings'      AS total_postings,
                   since_aug_aggregates->'totals'->>'digital_postings'    AS digital_postings,
                   since_aug_aggregates->'totals'->>'organisations_represented' AS orgs,
                   since_aug_aggregates->'totals'->>'duty_stations_represented' AS stations,
                   jsonb_array_length(since_aug_aggregates->'segments')   AS n_segments,
                   jsonb_array_length(since_aug_aggregates->'organisations') AS n_orgs,
                   jsonb_array_length(since_aug_aggregates->'geography')  AS n_geo
              FROM snapshots
             ORDER BY snapshot_date DESC
             LIMIT 3
            """
        )
        cols = [d.name for d in cur.description]
        for r in cur.fetchall():
            print(json.dumps(dict(zip(cols, r)), default=str, indent=2))
            print()

        print("=== top 5 segments since Aug ===")
        cur.execute(
            """
            SELECT seg->>'segment' AS segment,
                   (seg->>'count')::int AS count,
                   (seg->>'share_of_digital')::float AS share
              FROM snapshots,
                   jsonb_array_elements(since_aug_aggregates->'segments') AS seg
             WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM snapshots)
             ORDER BY count DESC
             LIMIT 5
            """
        )
        for r in cur.fetchall():
            print(f"  {r[0]:<20}  {r[1]:>5}  {r[2]:.2f}%")
        print()

        print("=== top 5 orgs since Aug ===")
        cur.execute(
            """
            SELECT org->>'organisation' AS organisation,
                   (org->>'digital_postings')::int AS digital,
                   (org->>'total_postings')::int AS total
              FROM snapshots,
                   jsonb_array_elements(since_aug_aggregates->'organisations') AS org
             WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM snapshots)
             ORDER BY digital DESC
             LIMIT 5
            """
        )
        for r in cur.fetchall():
            print(f"  {r[0]:<35}  digital={r[1]}  total={r[2]}")


if __name__ == "__main__":
    main()
