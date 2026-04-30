-- Add since_aug_aggregates column for the dashboard's Since-August tab.
--
-- The classifier always pulls the full Supabase feed (Aug 2025 onwards), but
-- the existing snapshot artefacts (segment_distribution, organisation_breakdown,
-- geography) filter to PRIMARY_PERIOD = Q1 2026. This new JSONB column carries
-- the wider Aug-2025-onwards aggregates produced by build_since_aug_aggregates()
-- in classifier-service/build_snapshots.py.
--
-- Nullable so old rows (and any failed Lambda runs) don't break.

ALTER TABLE snapshots
  ADD COLUMN IF NOT EXISTS since_aug_aggregates JSONB;
