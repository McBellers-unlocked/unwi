/**
 * Aurora v2 schema.
 *
 * Next.js is a pure reader. The Python Lambda classifier service is the sole
 * writer — it runs nightly, produces 12 artefacts in S3, and UPSERTs the
 * deck-slide datasets into these tables.
 *
 * Composite PKs on (snapshot_date, <natural key>) make same-day reruns
 * idempotent. All reads filter WHERE snapshot_date = (SELECT MAX(...)).
 */
import { sql } from "drizzle-orm";
import {
  check,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export interface HeadlineNumbers {
  total_postings: number;
  digital_postings: number;
  digital_share_pct: number;
  segments: Array<{ segment: string; count: number; share_pct: number }>;
  comparator?: {
    total_postings: number;
    digital_postings: number;
    digital_share_pct: number;
  };
}

export interface CutManifest {
  classifier_version_sha: string;
  period_from: string;
  period_to: string;
  comparator_from: string;
  comparator_to: string;
  apples_to_apples: { common_sources: string[] };
  warnings: string[];
}

export interface ConcurrencyTimeseries {
  segments: Array<{
    segment: string;
    points: Array<{ month: string; distinct_organisations: number }>;
  }>;
}

export interface QoQChange {
  segments: Array<{
    segment: string;
    primary_count: number;
    comparator_count: number;
    delta_abs: number;
    delta_pct: number;
  }>;
}

export interface CollisionProfiles {
  profiles: Array<{
    canonical_title: string;
    organisation_count: number;
    organisations: string[];
    segment: string;
  }>;
}

export interface StaffVsConsultant {
  segments: Array<{
    segment: string;
    staff_count: number;
    consultant_count: number;
    consultant_share_pct: number;
  }>;
}

export const snapshots = pgTable("snapshots", {
  snapshotDate: date("snapshot_date").primaryKey(),
  classifierVersionSha: text("classifier_version_sha").notNull(),
  primaryPeriodFrom: date("primary_period_from").notNull(),
  primaryPeriodTo: date("primary_period_to").notNull(),
  comparatorPeriodFrom: date("comparator_period_from").notNull(),
  comparatorPeriodTo: date("comparator_period_to").notNull(),
  totalPostings: integer("total_postings").notNull(),
  digitalPostings: integer("digital_postings").notNull(),
  digitalSharePct: numeric("digital_share_pct", {
    precision: 5,
    scale: 2,
  }).notNull(),
  organisationsRepresented: integer("organisations_represented").notNull(),
  headlineNumbers: jsonb("headline_numbers").$type<HeadlineNumbers>().notNull(),
  cutManifest: jsonb("cut_manifest").$type<CutManifest>().notNull(),
  concurrencyTimeseries: jsonb("concurrency_timeseries")
    .$type<ConcurrencyTimeseries>()
    .notNull(),
  qoqChange: jsonb("qoq_change").$type<QoQChange>().notNull(),
  collisionProfiles: jsonb("collision_profiles")
    .$type<CollisionProfiles>()
    .notNull(),
  staffVsConsultant: jsonb("staff_vs_consultant")
    .$type<StaffVsConsultant>()
    .notNull(),
  computedAt: timestamp("computed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const segmentDistribution = pgTable(
  "segment_distribution",
  {
    snapshotDate: date("snapshot_date").notNull(),
    segment: text("segment").notNull(),
    count: integer("count").notNull(),
    shareOfDigital: numeric("share_of_digital", {
      precision: 5,
      scale: 2,
    }).notNull(),
    shareOfAll: numeric("share_of_all", { precision: 5, scale: 2 }).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.snapshotDate, t.segment] }) }),
);

export const organisationBreakdown = pgTable(
  "organisation_breakdown",
  {
    snapshotDate: date("snapshot_date").notNull(),
    organisation: text("organisation").notNull(),
    totalPostings: integer("total_postings").notNull(),
    digitalPostings: integer("digital_postings").notNull(),
    digitalShare: numeric("digital_share", {
      precision: 5,
      scale: 2,
    }).notNull(),
    topSegment1: text("top_segment_1"),
    topSegment2: text("top_segment_2"),
    topSegment3: text("top_segment_3"),
  },
  (t) => ({ pk: primaryKey({ columns: [t.snapshotDate, t.organisation] }) }),
);

export const geography = pgTable(
  "geography",
  {
    snapshotDate: date("snapshot_date").notNull(),
    locationOrCountry: text("location_or_country").notNull(),
    count: integer("count").notNull(),
    share: numeric("share", { precision: 5, scale: 2 }).notNull(),
    topSegment: text("top_segment"),
    topSegments: jsonb("top_segments").$type<string[]>(),
    organisationCount: integer("organisation_count"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.snapshotDate, t.locationOrCountry] }),
  }),
);

export const comparatorSegmentShares = pgTable(
  "comparator_segment_shares",
  {
    snapshotDate: date("snapshot_date").notNull(),
    segment: text("segment").notNull(),
    primaryCount: integer("primary_count").notNull(),
    primaryShare: numeric("primary_share", {
      precision: 5,
      scale: 2,
    }).notNull(),
    comparatorCount: integer("comparator_count").notNull(),
    comparatorShare: numeric("comparator_share", {
      precision: 5,
      scale: 2,
    }).notNull(),
    deltaPp: numeric("delta_pp", { precision: 5, scale: 2 }).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.snapshotDate, t.segment] }) }),
);

export const sourceCoverage = pgTable(
  "source_coverage",
  {
    snapshotDate: date("snapshot_date").notNull(),
    source: text("source").notNull(),
    totalCount: integer("total_count").notNull(),
    digitalCount: integer("digital_count").notNull(),
    shareOfDigital: numeric("share_of_digital", {
      precision: 5,
      scale: 2,
    }).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.snapshotDate, t.source] }) }),
);

export const segmentWindowAggregates = pgTable(
  "segment_window_aggregates",
  {
    snapshotDate: date("snapshot_date").notNull(),
    windowDays: integer("window_days").notNull(),
    segment: text("segment").notNull(),
    roleCount: integer("role_count").notNull(),
    orgCount: integer("org_count").notNull(),
  },
  (t) => ({
    pk: primaryKey({
      columns: [t.snapshotDate, t.windowDays, t.segment],
    }),
    windowCheck: check(
      "segment_window_aggregates_window_days_check",
      sql`${t.windowDays} in (30, 60, 90)`,
    ),
  }),
);

export const activeRoles = pgTable("active_roles", {
  roleId: text("role_id").primaryKey(),
  snapshotDate: date("snapshot_date").notNull(),
  title: text("title").notNull(),
  organisation: text("organisation").notNull(),
  segment: text("segment").notNull(),
  location: text("location"),
  postedDate: date("posted_date"),
  closingDate: date("closing_date"),
  sourceUrl: text("source_url"),
  level: text("level"),
});

export const snapshotRuns = pgTable(
  "snapshot_runs",
  {
    id: serial("id").primaryKey(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    rowsFetched: integer("rows_fetched"),
    rowsClassified: integer("rows_classified"),
    status: text("status").notNull(),
    errorMessage: text("error_message"),
    s3KeyPrefix: text("s3_key_prefix"),
  },
  (t) => ({
    statusCheck: check(
      "snapshot_runs_status_check",
      sql`${t.status} in ('running', 'success', 'failed')`,
    ),
  }),
);

export type Snapshot = typeof snapshots.$inferSelect;
export type SegmentDistributionRow = typeof segmentDistribution.$inferSelect;
export type OrganisationBreakdownRow = typeof organisationBreakdown.$inferSelect;
export type GeographyRow = typeof geography.$inferSelect;
export type ComparatorSegmentShareRow = typeof comparatorSegmentShares.$inferSelect;
export type SourceCoverageRow = typeof sourceCoverage.$inferSelect;
export type ActiveRole = typeof activeRoles.$inferSelect;
export type SnapshotRun = typeof snapshotRuns.$inferSelect;
export type SegmentWindowAggregateRow =
  typeof segmentWindowAggregates.$inferSelect;
