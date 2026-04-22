"""
Lambda entrypoint for the UNWI classifier service.

Event shape:
  {}                                 normal run (read env, write S3 + Aurora)
  {"dry_run": true}                  skip S3 + DB; write artefacts to ./out/
  {"dry_run": true, "csv_path": X}   use an existing classified CSV; skip fetch

Env vars (normal run):
  DB_SECRET_ARN  Secrets Manager ARN holding {"username":..., "password":...}
  AURORA_HOST    Aurora writer endpoint (hostname)
  AURORA_DB      Aurora database name (default "unwi")
  S3_BUCKET      Target bucket for artefacts
  S3_PREFIX      Key prefix (default "snapshots")
"""
from __future__ import annotations

import hashlib
import json
import os
import socket
import sys
import traceback
from datetime import date, datetime, timezone
from pathlib import Path

from build_snapshots import (
    PRIMARY_PERIOD,
    COMPARATOR_PERIOD,
    _geography_by_location,
    build_all,
    load_rows,
)


def _classifier_sha() -> str:
    target = Path(__file__).parent / "classifier_v2.py"
    h = hashlib.sha1()
    with target.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _run_dry(csv_path: Path, out_dir: Path) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    artefacts = build_all(csv_path, PRIMARY_PERIOD, COMPARATOR_PERIOD)
    for name, data in artefacts.items():
        (out_dir / name).write_bytes(data)
    return {
        "dry_run": True,
        "csv_path": str(csv_path),
        "out_dir": str(out_dir),
        "artefacts": sorted(artefacts.keys()),
    }


def _db_credentials(secret_arn: str) -> tuple[str, str]:
    import boto3

    client = boto3.client("secretsmanager")
    raw = client.get_secret_value(SecretId=secret_arn)["SecretString"]
    parsed = json.loads(raw)
    return parsed["username"], parsed["password"]


def _upload_artefacts(
    artefacts: dict[str, bytes], bucket: str, prefix: str, snapshot_date: str
) -> str:
    import boto3

    s3 = boto3.client("s3")
    key_prefix_dated = f"{prefix}/{snapshot_date}"
    key_prefix_latest = f"{prefix}/latest"
    for name, data in artefacts.items():
        s3.put_object(Bucket=bucket, Key=f"{key_prefix_dated}/{name}", Body=data)
        s3.put_object(Bucket=bucket, Key=f"{key_prefix_latest}/{name}", Body=data)
    return key_prefix_dated


def _write_to_aurora(
    artefacts: dict[str, bytes],
    rows_loaded: list,
    snapshot_date: str,
    host: str,
    db_name: str,
    username: str,
    password: str,
    rows_fetched: int,
    rows_classified: int,
    s3_key_prefix: str,
) -> None:
    import psycopg

    dsn = f"host={host} dbname={db_name} user={username} password={password} sslmode=require"
    with psycopg.connect(dsn, autocommit=False) as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO snapshot_runs
              (started_at, status, rows_fetched, rows_classified, s3_key_prefix)
            VALUES (now(), 'running', %s, %s, %s)
            RETURNING id
            """,
            (rows_fetched, rows_classified, s3_key_prefix),
        )
        run_id = cur.fetchone()[0]

        try:
            _upsert_snapshot(cur, artefacts, snapshot_date)
            _replace_segment_distribution(cur, artefacts, snapshot_date)
            _replace_organisation_breakdown(cur, artefacts, snapshot_date)
            _replace_geography(cur, rows_loaded, snapshot_date)
            _replace_comparator_segment_shares(cur, artefacts, snapshot_date)
            _replace_source_coverage(cur, artefacts, snapshot_date)
            _refresh_active_roles(cur, rows_loaded, snapshot_date)

            cur.execute(
                """
                UPDATE snapshot_runs
                   SET finished_at = now(), status = 'success'
                 WHERE id = %s
                """,
                (run_id,),
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            with conn.cursor() as c2:
                c2.execute(
                    """
                    UPDATE snapshot_runs
                       SET finished_at = now(),
                           status = 'failed',
                           error_message = %s
                     WHERE id = %s
                    """,
                    (str(e)[:500], run_id),
                )
                conn.commit()
            raise


def _upsert_snapshot(cur, artefacts, snapshot_date):
    headline = json.loads(artefacts["headline_numbers.json"])
    manifest = json.loads(artefacts["cut_manifest.json"])

    cur.execute(
        """
        INSERT INTO snapshots (
            snapshot_date, classifier_version_sha,
            primary_period_from, primary_period_to,
            comparator_period_from, comparator_period_to,
            total_postings, digital_postings, digital_share_pct,
            organisations_represented,
            headline_numbers, cut_manifest,
            concurrency_timeseries, qoq_change,
            collision_profiles, staff_vs_consultant,
            computed_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb,
                %s::jsonb, %s::jsonb, now())
        ON CONFLICT (snapshot_date) DO UPDATE SET
            classifier_version_sha   = EXCLUDED.classifier_version_sha,
            primary_period_from      = EXCLUDED.primary_period_from,
            primary_period_to        = EXCLUDED.primary_period_to,
            comparator_period_from   = EXCLUDED.comparator_period_from,
            comparator_period_to     = EXCLUDED.comparator_period_to,
            total_postings           = EXCLUDED.total_postings,
            digital_postings         = EXCLUDED.digital_postings,
            digital_share_pct        = EXCLUDED.digital_share_pct,
            organisations_represented = EXCLUDED.organisations_represented,
            headline_numbers         = EXCLUDED.headline_numbers,
            cut_manifest             = EXCLUDED.cut_manifest,
            concurrency_timeseries   = EXCLUDED.concurrency_timeseries,
            qoq_change               = EXCLUDED.qoq_change,
            collision_profiles       = EXCLUDED.collision_profiles,
            staff_vs_consultant      = EXCLUDED.staff_vs_consultant,
            computed_at              = now()
        """,
        (
            snapshot_date,
            manifest["classifier_version"]["file_sha1"],
            headline["period_from"],
            headline["period_to"],
            headline["comparator_period"]["from"],
            headline["comparator_period"]["to"],
            headline["total_postings"],
            headline["digital_postings"],
            headline["digital_share_pct"],
            headline["organisations_represented"],
            artefacts["headline_numbers.json"].decode("utf-8"),
            artefacts["cut_manifest.json"].decode("utf-8"),
            artefacts["concurrency_timeseries.json"].decode("utf-8"),
            artefacts["qoq_change.json"].decode("utf-8"),
            artefacts["collision_profiles.json"].decode("utf-8"),
            artefacts["staff_vs_consultant.json"].decode("utf-8"),
        ),
    )


def _csv_rows(csv_bytes: bytes):
    import csv as csv_mod
    import io

    reader = csv_mod.DictReader(io.StringIO(csv_bytes.decode("utf-8")))
    return list(reader)


def _replace_segment_distribution(cur, artefacts, snapshot_date):
    cur.execute("DELETE FROM segment_distribution WHERE snapshot_date = %s", (snapshot_date,))
    rows = _csv_rows(artefacts["segment_distribution.csv"])
    for r in rows:
        cur.execute(
            """
            INSERT INTO segment_distribution
                (snapshot_date, segment, count, share_of_digital, share_of_all)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                snapshot_date,
                r["segment"],
                int(r["count"]),
                float(r["share_of_digital"]) if r["share_of_digital"] else 0.0,
                float(r["share_of_all"]),
            ),
        )


def _replace_organisation_breakdown(cur, artefacts, snapshot_date):
    cur.execute(
        "DELETE FROM organisation_breakdown WHERE snapshot_date = %s", (snapshot_date,)
    )
    for r in _csv_rows(artefacts["organisation_breakdown.csv"]):
        cur.execute(
            """
            INSERT INTO organisation_breakdown
                (snapshot_date, organisation, total_postings, digital_postings,
                 digital_share, top_segment_1, top_segment_2, top_segment_3)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                snapshot_date,
                r["organisation"],
                int(r["total_postings"]),
                int(r["digital_postings"]),
                float(r["digital_share"]),
                r["top_segment_1"] or None,
                r["top_segment_2"] or None,
                r["top_segment_3"] or None,
            ),
        )


def _replace_geography(cur, rows_loaded, snapshot_date):
    """Write geography with top-3 segments and distinct org count per location.
    Skips the CSV (which only carries top_segment singular) and computes
    richer per-location data directly from the loaded rows."""
    data = _geography_by_location(rows_loaded, PRIMARY_PERIOD)
    if not data:
        return
    cur.execute("DELETE FROM geography WHERE snapshot_date = %s", (snapshot_date,))
    for loc, d in data.items():
        cur.execute(
            """
            INSERT INTO geography
                (snapshot_date, location_or_country, count, share,
                 top_segment, top_segments, organisation_count)
            VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s)
            """,
            (
                snapshot_date,
                loc,
                d["count"],
                d["share"],
                d["top_segments"][0] if d["top_segments"] else None,
                json.dumps(d["top_segments"]),
                len(d["organisations"]),
            ),
        )


def _replace_comparator_segment_shares(cur, artefacts, snapshot_date):
    cur.execute(
        "DELETE FROM comparator_segment_shares WHERE snapshot_date = %s",
        (snapshot_date,),
    )
    for r in _csv_rows(artefacts["comparator_segment_shares.csv"]):
        cur.execute(
            """
            INSERT INTO comparator_segment_shares
                (snapshot_date, segment, primary_count, primary_share,
                 comparator_count, comparator_share, delta_pp)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                snapshot_date,
                r["segment"],
                int(r["primary_count"]),
                float(r["primary_share"]),
                int(r["comparator_count"]),
                float(r["comparator_share"]),
                float(r["delta_pp"]),
            ),
        )


def _replace_source_coverage(cur, artefacts, snapshot_date):
    cur.execute(
        "DELETE FROM source_coverage WHERE snapshot_date = %s", (snapshot_date,)
    )
    for r in _csv_rows(artefacts["source_coverage.csv"]):
        cur.execute(
            """
            INSERT INTO source_coverage
                (snapshot_date, source, total_count, digital_count, share_of_digital)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                snapshot_date,
                r["source"],
                int(r["total_count"]),
                int(r["digital_count"]),
                float(r["share_of_digital"]),
            ),
        )


def _refresh_active_roles(cur, rows, snapshot_date):
    """TRUNCATE + INSERT — a snapshot carries the full current role catalogue."""
    today = date.fromisoformat(snapshot_date)
    cur.execute("TRUNCATE TABLE active_roles")
    for r in rows:
        if not r.segment:
            continue
        if r.closing_date and r.closing_date < today:
            continue
        cur.execute(
            """
            INSERT INTO active_roles
                (role_id, snapshot_date, title, organisation, segment,
                 location, posted_date, closing_date, source_url, level)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (role_id) DO UPDATE SET
                snapshot_date = EXCLUDED.snapshot_date,
                title         = EXCLUDED.title,
                organisation  = EXCLUDED.organisation,
                segment       = EXCLUDED.segment,
                location      = EXCLUDED.location,
                posted_date   = EXCLUDED.posted_date,
                closing_date  = EXCLUDED.closing_date,
                source_url    = EXCLUDED.source_url,
                level         = EXCLUDED.level
            """,
            (
                r.id,
                snapshot_date,
                r.title,
                r.organization,
                r.segment,
                r.location,
                r.posted_date,
                r.closing_date,
                r.source_url,
                r.level,
            ),
        )


def lambda_handler(event, context):
    event = event or {}
    dry_run = bool(event.get("dry_run"))
    out_dir = Path(event.get("out_dir") or "./out").resolve()

    if dry_run:
        csv_path = event.get("csv_path")
        if csv_path:
            return _run_dry(Path(csv_path), out_dir)
        from classify_aggregator import fetch_and_classify

        out_dir.mkdir(parents=True, exist_ok=True)
        csv_path, n_total, _n_digital = fetch_and_classify(out_dir)
        return _run_dry(csv_path, out_dir)

    from classify_aggregator import fetch_and_classify

    bucket = os.environ["S3_BUCKET"]
    prefix = os.environ.get("S3_PREFIX", "snapshots")
    aurora_host = os.environ["AURORA_HOST"]
    aurora_db = os.environ.get("AURORA_DB", "unwi")
    secret_arn = os.environ["DB_SECRET_ARN"]

    snapshot_date = datetime.now(timezone.utc).date().isoformat()

    work_dir = Path("/tmp/unwi-work")
    work_dir.mkdir(parents=True, exist_ok=True)
    csv_path, n_total, n_digital = fetch_and_classify(work_dir)
    rows_loaded = load_rows(csv_path)
    artefacts = build_all(csv_path, PRIMARY_PERIOD, COMPARATOR_PERIOD)

    s3_prefix = _upload_artefacts(artefacts, bucket, prefix, snapshot_date)

    username, password = _db_credentials(secret_arn)
    _write_to_aurora(
        artefacts,
        rows_loaded,
        snapshot_date,
        aurora_host,
        aurora_db,
        username,
        password,
        rows_fetched=n_total,
        rows_classified=n_digital,
        s3_key_prefix=s3_prefix,
    )

    return {
        "snapshot_date": snapshot_date,
        "rows_fetched": n_total,
        "rows_classified": n_digital,
        "s3_key_prefix": s3_prefix,
        "classifier_sha": _classifier_sha(),
    }


if __name__ == "__main__":
    event = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {"dry_run": True}
    print(json.dumps(lambda_handler(event, None), indent=2, default=str))
