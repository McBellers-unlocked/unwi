-- Per-organisation digital-posting counts for both periods (Q4 2025 and Q1 2026).
--
-- Mirrors comparator_segment_shares but at the organisation level. Powers
-- the Q4 ↔ Q1 movers callout. Restricted to apples-to-apples sources by
-- the classifier so the comparison stays consistent with section 03.

CREATE TABLE comparator_organisation_breakdown (
  snapshot_date     DATE    NOT NULL,
  organisation      TEXT    NOT NULL,
  primary_count     INTEGER NOT NULL,
  comparator_count  INTEGER NOT NULL,
  PRIMARY KEY (snapshot_date, organisation)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON comparator_organisation_breakdown TO unwi_writer;
GRANT SELECT ON comparator_organisation_breakdown TO unwi_reader;
