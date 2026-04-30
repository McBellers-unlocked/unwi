"""Spot-check scope_breakdown on the latest snapshot."""
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
            SELECT scope_breakdown
              FROM snapshots
             ORDER BY snapshot_date DESC
             LIMIT 1
            """
        )
        row = cur.fetchone()
        if not row or not row[0]:
            print("scope_breakdown not populated")
            return
        sb = row[0]
        print(f"groups: {sb['totals']['groups_represented']}  "
              f"total_postings: {sb['totals']['total_postings']}  "
              f"digital: {sb['totals']['digital_postings']}")
        print()
        print(f"{'group':<40}  {'total':>6}  {'digital':>7}  {'orgs':>4}  earliest -> latest")
        for g in sb["groups"]:
            print(
                f"  {g['group']:<38}  {g['total_postings']:>6}  "
                f"{g['digital_postings']:>7}  "
                f"{g['organisations_represented']:>4}  "
                f"{g.get('earliest_posted', '?')} -> {g.get('latest_posted', '?')}"
            )
        print()
        for g in sb["groups"]:
            if g["group"] == "UN Common System":
                continue
            buckets = g.get("top_buckets") or []
            if not buckets:
                continue
            top = ", ".join(f"{b['bucket']} ({b['count']})" for b in buckets)
            print(f"{g['group']} top buckets: {top}")


if __name__ == "__main__":
    main()
