-- Per-scope-group totals for the dashboard's coverage tile.
--
-- Stored as JSONB on the snapshots row (mirrors since_aug_aggregates).
-- Captures: UN Common System, Bretton Woods, Regional Development Banks,
-- European Union, Other International Organisations.
--
-- Nullable so historical rows predating the builder don't break.

ALTER TABLE snapshots
  ADD COLUMN IF NOT EXISTS scope_breakdown JSONB;
