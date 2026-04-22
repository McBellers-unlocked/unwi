-- UNWI v2 schema pivot (2026 Q1 Digital Issue)
--
-- Next.js stops computing; the Python classifier Lambda becomes the sole
-- writer. Drops v0.1 tables and creates the v2 set of 8 tables.

DROP TABLE IF EXISTS daily_snapshots CASCADE;
DROP TABLE IF EXISTS skill_cluster_snapshots CASCADE;
DROP TABLE IF EXISTS agency_snapshots CASCADE;
DROP TABLE IF EXISTS snapshot_runs CASCADE;

CREATE TABLE snapshots (
  snapshot_date            DATE PRIMARY KEY,
  classifier_version_sha   TEXT NOT NULL,
  primary_period_from      DATE NOT NULL,
  primary_period_to        DATE NOT NULL,
  comparator_period_from   DATE NOT NULL,
  comparator_period_to     DATE NOT NULL,
  total_postings           INTEGER NOT NULL,
  digital_postings         INTEGER NOT NULL,
  digital_share_pct        NUMERIC(5, 2) NOT NULL,
  organisations_represented INTEGER NOT NULL,
  headline_numbers         JSONB NOT NULL,
  cut_manifest             JSONB NOT NULL,
  concurrency_timeseries   JSONB NOT NULL,
  qoq_change               JSONB NOT NULL,
  collision_profiles       JSONB NOT NULL,
  staff_vs_consultant      JSONB NOT NULL,
  computed_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE segment_distribution (
  snapshot_date     DATE NOT NULL,
  segment           TEXT NOT NULL,
  count             INTEGER NOT NULL,
  share_of_digital  NUMERIC(5, 2) NOT NULL,
  share_of_all      NUMERIC(5, 2) NOT NULL,
  PRIMARY KEY (snapshot_date, segment)
);

CREATE TABLE organisation_breakdown (
  snapshot_date      DATE NOT NULL,
  organisation       TEXT NOT NULL,
  total_postings     INTEGER NOT NULL,
  digital_postings   INTEGER NOT NULL,
  digital_share      NUMERIC(5, 2) NOT NULL,
  top_segment_1      TEXT,
  top_segment_2      TEXT,
  top_segment_3      TEXT,
  PRIMARY KEY (snapshot_date, organisation)
);

CREATE TABLE geography (
  snapshot_date        DATE NOT NULL,
  location_or_country  TEXT NOT NULL,
  count                INTEGER NOT NULL,
  share                NUMERIC(5, 2) NOT NULL,
  top_segment          TEXT,
  top_segments         JSONB,
  organisation_count   INTEGER,
  PRIMARY KEY (snapshot_date, location_or_country)
);

CREATE TABLE comparator_segment_shares (
  snapshot_date     DATE NOT NULL,
  segment           TEXT NOT NULL,
  primary_count     INTEGER NOT NULL,
  primary_share     NUMERIC(5, 2) NOT NULL,
  comparator_count  INTEGER NOT NULL,
  comparator_share  NUMERIC(5, 2) NOT NULL,
  delta_pp          NUMERIC(5, 2) NOT NULL,
  PRIMARY KEY (snapshot_date, segment)
);

CREATE TABLE source_coverage (
  snapshot_date     DATE NOT NULL,
  source            TEXT NOT NULL,
  total_count       INTEGER NOT NULL,
  digital_count     INTEGER NOT NULL,
  share_of_digital  NUMERIC(5, 2) NOT NULL,
  PRIMARY KEY (snapshot_date, source)
);

CREATE TABLE active_roles (
  role_id        TEXT PRIMARY KEY,
  snapshot_date  DATE NOT NULL,
  title          TEXT NOT NULL,
  organisation   TEXT NOT NULL,
  segment        TEXT NOT NULL,
  location       TEXT,
  posted_date    DATE,
  closing_date   DATE,
  source_url     TEXT,
  level          TEXT
);

CREATE INDEX idx_active_roles_closing_date ON active_roles (closing_date);
CREATE INDEX idx_active_roles_segment ON active_roles (segment);

CREATE TABLE snapshot_runs (
  id               SERIAL PRIMARY KEY,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at      TIMESTAMPTZ,
  rows_fetched     INTEGER,
  rows_classified  INTEGER,
  status           TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  error_message    TEXT,
  s3_key_prefix    TEXT
);

CREATE INDEX idx_snapshot_runs_finished_at
  ON snapshot_runs (finished_at DESC);

-- -----------------------------------------------------------------------
-- Least-privilege DB roles.
--
-- Created without passwords; operators MUST set credentials after migration
-- with:
--   ALTER ROLE unwi_writer PASSWORD '<from Secrets Manager unwi/aurora/writer>';
--   ALTER ROLE unwi_reader PASSWORD '<from Secrets Manager unwi/aurora/reader>';
-- See infra/README.md "DB user setup".
--
-- unwi_writer  SELECT/INSERT/UPDATE/DELETE on snapshot tables — Lambda classifier
-- unwi_reader  SELECT only on all tables                        — Amplify SSR
-- -----------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'unwi_writer') THEN
        CREATE ROLE unwi_writer LOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'unwi_reader') THEN
        CREATE ROLE unwi_reader LOGIN;
    END IF;
END
$$;

GRANT CONNECT ON DATABASE unwi TO unwi_writer, unwi_reader;
GRANT USAGE ON SCHEMA public TO unwi_writer, unwi_reader;

GRANT SELECT, INSERT, UPDATE, DELETE ON
    snapshots,
    segment_distribution,
    organisation_breakdown,
    geography,
    comparator_segment_shares,
    source_coverage,
    active_roles,
    snapshot_runs
  TO unwi_writer;
GRANT USAGE, SELECT ON SEQUENCE snapshot_runs_id_seq TO unwi_writer;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO unwi_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO unwi_reader;
