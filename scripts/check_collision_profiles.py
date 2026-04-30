"""Check whether the latest snapshot's collision_profiles JSON has posting_counts."""
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
            SELECT snapshot_date, collision_profiles
              FROM snapshots
             ORDER BY snapshot_date DESC
             LIMIT 1
            """
        )
        row = cur.fetchone()
        if not row:
            print("no snapshots")
            return
        snapshot_date, profiles = row
        n = len(profiles.get("profiles", []))
        with_counts = sum(1 for p in profiles["profiles"] if p.get("posting_counts"))
        print(f"snapshot_date: {snapshot_date}")
        print(f"  profiles: {n}")
        print(f"  with posting_counts: {with_counts}")
        print()
        if profiles["profiles"]:
            sample = profiles["profiles"][0]
            print(f"sample profile keys: {sorted(sample.keys())}")
            if "posting_counts" in sample:
                print(f"sample posting_counts: {sample['posting_counts']}")
            else:
                print("(posting_counts missing — heatmap will render in binary fallback)")


if __name__ == "__main__":
    main()
