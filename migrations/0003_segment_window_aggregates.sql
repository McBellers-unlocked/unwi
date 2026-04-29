-- Rolling-window aggregates for Section 02's 30/60/90-day toggle.
--
-- A row belongs to window W if its posted_date is in
-- (snapshot_date - W, snapshot_date]. Excludes NOT_DIGITAL.
-- Composite PK matches the existing snapshot tables: same-day reruns are
-- idempotent because the writer DELETEs by snapshot_date before INSERTing.

CREATE TABLE segment_window_aggregates (
  snapshot_date  DATE    NOT NULL,
  window_days    INTEGER NOT NULL,
  segment        TEXT    NOT NULL,
  role_count     INTEGER NOT NULL,
  org_count      INTEGER NOT NULL,
  PRIMARY KEY (snapshot_date, window_days, segment),
  CONSTRAINT segment_window_aggregates_window_days_check
    CHECK (window_days IN (30, 60, 90))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON segment_window_aggregates TO unwi_writer;
GRANT SELECT ON segment_window_aggregates TO unwi_reader;
