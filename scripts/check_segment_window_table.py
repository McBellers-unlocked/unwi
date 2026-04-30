"""Check whether segment_window_aggregates table exists in prod Aurora."""
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
            SELECT table_name
              FROM information_schema.tables
             WHERE table_schema = 'public'
               AND table_name IN ('segment_window_aggregates', 'snapshots')
             ORDER BY table_name
            """
        )
        for r in cur.fetchall():
            print(f"  {r[0]}")
        print()

        cur.execute(
            """
            SELECT id, started_at, finished_at, status, error_message
              FROM snapshot_runs
             ORDER BY started_at DESC
             LIMIT 5
            """
        )
        print("recent snapshot_runs:")
        for r in cur.fetchall():
            print(f"  id={r[0]} started={r[1]} finished={r[2]} status={r[3]} err={r[4]}")


if __name__ == "__main__":
    main()
