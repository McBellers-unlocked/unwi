"""Apply migrations/0004_since_aug_aggregates.sql to Aurora.

Standalone helper because npm run db:migrate uses .env.local DATABASE_URL,
which on this machine points at a non-existent local Postgres. Pulls writer
creds from Secrets Manager and runs the SQL idempotently.

Originally created when the file was 0003_*; renumbered to 0004 after
0003_segment_window_aggregates landed on main first. Migration body is
ADD COLUMN IF NOT EXISTS so re-running is safe.
"""
import json
import subprocess
from pathlib import Path

import psycopg


def main() -> None:
    sql = Path(__file__).resolve().parent.parent / "migrations" / "0004_since_aug_aggregates.sql"
    statement = sql.read_text(encoding="utf-8")

    raw = subprocess.check_output(
        [
            "aws",
            "secretsmanager",
            "get-secret-value",
            "--secret-id",
            "unwi/aurora/master",
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
        print("Applying migration 0003_since_aug_aggregates.sql...")
        cur.execute(statement)
        conn.commit()

        cur.execute(
            """
            SELECT column_name, data_type, is_nullable
              FROM information_schema.columns
             WHERE table_name = 'snapshots'
               AND column_name = 'since_aug_aggregates'
            """
        )
        rows = cur.fetchall()
        if rows:
            for r in rows:
                print(f"verified: {r[0]} ({r[1]}, nullable={r[2]})")
        else:
            print("WARNING: column not found after migration")


if __name__ == "__main__":
    main()
