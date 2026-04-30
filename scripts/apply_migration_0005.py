"""Apply migrations/0005_comparator_organisation_breakdown.sql to Aurora."""
import json
import subprocess
from pathlib import Path

import psycopg


def main() -> None:
    sql = Path(__file__).resolve().parent.parent / "migrations" / "0005_comparator_organisation_breakdown.sql"
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
        print("Applying migration 0005_comparator_organisation_breakdown.sql...")
        cur.execute(statement)
        conn.commit()

        cur.execute(
            """
            SELECT column_name, data_type
              FROM information_schema.columns
             WHERE table_name = 'comparator_organisation_breakdown'
             ORDER BY ordinal_position
            """
        )
        rows = cur.fetchall()
        if not rows:
            print("WARNING: table not visible after migration")
            return
        print("verified columns:")
        for r in rows:
            print(f"  {r[0]:<18} {r[1]}")


if __name__ == "__main__":
    main()
