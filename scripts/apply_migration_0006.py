"""Apply migrations/0006_scope_breakdown.sql to Aurora."""
import json
import subprocess
from pathlib import Path

import psycopg


def main() -> None:
    sql = Path(__file__).resolve().parent.parent / "migrations" / "0006_scope_breakdown.sql"
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
        print("Applying migration 0006_scope_breakdown.sql...")
        cur.execute(statement)
        conn.commit()
        cur.execute(
            """
            SELECT column_name, data_type, is_nullable
              FROM information_schema.columns
             WHERE table_name = 'snapshots' AND column_name = 'scope_breakdown'
            """
        )
        for r in cur.fetchall():
            print(f"verified: {r[0]} ({r[1]}, nullable={r[2]})")


if __name__ == "__main__":
    main()
