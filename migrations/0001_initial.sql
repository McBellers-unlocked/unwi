-- UNWI initial schema (v0.1)
--
-- Four tables:
--   daily_snapshots          system-wide counters + raw_metrics JSONB
--   skill_cluster_snapshots  per-cluster, per-day history
--   agency_snapshots         per-agency, per-day fingerprint
--   snapshot_runs            cron invocation ledger
--
-- All UPSERTs in the cron path target the natural primary keys so re-runs on
-- the same calendar day overwrite the latest figures cleanly.

CREATE TABLE IF NOT EXISTS daily_snapshots (
  snapshot_date            DATE PRIMARY KEY,
  total_active_posts       INTEGER NOT NULL,
  total_ytd_posts          INTEGER NOT NULL,
  distinct_agencies        INTEGER NOT NULL,
  digital_posts_count      INTEGER NOT NULL,
  digital_posts_share_pct  NUMERIC(5, 2) NOT NULL,
  duplication_events_count INTEGER NOT NULL,
  duplication_cost_eur     NUMERIC(14, 2) NOT NULL,
  median_time_to_close_days INTEGER,
  hq_concentration_pct     NUMERIC(5, 2),
  raw_metrics              JSONB NOT NULL,
  computed_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skill_cluster_snapshots (
  snapshot_date       DATE NOT NULL,
  skill_cluster       TEXT NOT NULL,
  post_count_90d      INTEGER NOT NULL,
  post_count_30d      INTEGER NOT NULL,
  post_count_alltime  INTEGER NOT NULL,
  PRIMARY KEY (snapshot_date, skill_cluster)
);

CREATE TABLE IF NOT EXISTS agency_snapshots (
  snapshot_date              DATE NOT NULL,
  organization               TEXT NOT NULL,
  total_active_posts         INTEGER NOT NULL,
  p_level_posts              INTEGER NOT NULL,
  hq_posts                   INTEGER NOT NULL,
  field_posts                INTEGER NOT NULL,
  median_time_to_close_days  INTEGER,
  reposting_rate_pct         NUMERIC(5, 2),
  consultant_ratio_pct       NUMERIC(5, 2),
  top_skill_clusters         JSONB,
  PRIMARY KEY (snapshot_date, organization)
);

CREATE TABLE IF NOT EXISTS snapshot_runs (
  id             SERIAL PRIMARY KEY,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at    TIMESTAMPTZ,
  rows_fetched   INTEGER,
  status         TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  error_message  TEXT
);

-- Helpful indexes for dashboard reads.
CREATE INDEX IF NOT EXISTS idx_skill_cluster_snapshots_date
  ON skill_cluster_snapshots (snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_agency_snapshots_date
  ON agency_snapshots (snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_snapshot_runs_finished_at
  ON snapshot_runs (finished_at DESC);
