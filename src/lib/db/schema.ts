/**
 * Aurora snapshot schema.
 *
 * Raw jobs are pulled from Supabase each night, computed into findings, and
 * written here. The dashboard reads ONLY from these tables — never the raw API.
 * That gives us a deterministic audit trail and lets the UI stay latency-free.
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
import type { ObservatoryFindings } from "@/lib/compute/types";

/** System-wide counters + a JSONB blob for everything that doesn't fit clean columns. */
export const dailySnapshots = pgTable("daily_snapshots", {
  snapshotDate: date("snapshot_date").primaryKey(),
  totalActivePosts: integer("total_active_posts").notNull(),
  totalYtdPosts: integer("total_ytd_posts").notNull(),
  distinctAgencies: integer("distinct_agencies").notNull(),
  digitalPostsCount: integer("digital_posts_count").notNull(),
  digitalPostsSharePct: numeric("digital_posts_share_pct", {
    precision: 5,
    scale: 2,
  }).notNull(),
  duplicationEventsCount: integer("duplication_events_count").notNull(),
  duplicationCostEur: numeric("duplication_cost_eur", {
    precision: 14,
    scale: 2,
  }).notNull(),
  medianTimeToCloseDays: integer("median_time_to_close_days"),
  hqConcentrationPct: numeric("hq_concentration_pct", { precision: 5, scale: 2 }),
  /**
   * Full findings blob — lets us extend modules without schema migrations.
   * Typed on read via ObservatoryFindings cast.
   */
  rawMetrics: jsonb("raw_metrics").$type<ObservatoryFindings>().notNull(),
  computedAt: timestamp("computed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Per-skill-cluster history. Feeds the Skills Heatmap trend line + Digital Talent area chart. */
export const skillClusterSnapshots = pgTable(
  "skill_cluster_snapshots",
  {
    snapshotDate: date("snapshot_date").notNull(),
    skillCluster: text("skill_cluster").notNull(),
    postCount90d: integer("post_count_90d").notNull(),
    postCount30d: integer("post_count_30d").notNull(),
    postCountAllTime: integer("post_count_alltime").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.snapshotDate, t.skillCluster] }),
  }),
);

/** Per-agency snapshot — everything needed by the Agency Fingerprint module. */
export const agencySnapshots = pgTable(
  "agency_snapshots",
  {
    snapshotDate: date("snapshot_date").notNull(),
    organization: text("organization").notNull(),
    totalActivePosts: integer("total_active_posts").notNull(),
    pLevelPosts: integer("p_level_posts").notNull(),
    hqPosts: integer("hq_posts").notNull(),
    fieldPosts: integer("field_posts").notNull(),
    medianTimeToCloseDays: integer("median_time_to_close_days"),
    repostingRatePct: numeric("reposting_rate_pct", { precision: 5, scale: 2 }),
    consultantRatioPct: numeric("consultant_ratio_pct", {
      precision: 5,
      scale: 2,
    }),
    topSkillClusters: jsonb("top_skill_clusters").$type<
      Array<{ cluster: string; count: number }>
    >(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.snapshotDate, t.organization] }),
  }),
);

/** Run ledger — one row per cron invocation, success or failure. */
export const snapshotRuns = pgTable(
  "snapshot_runs",
  {
    id: serial("id").primaryKey(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    rowsFetched: integer("rows_fetched"),
    status: text("status").notNull(),
    errorMessage: text("error_message"),
  },
  (t) => ({
    statusCheck: check(
      "snapshot_runs_status_check",
      sql`${t.status} in ('running', 'success', 'failed')`,
    ),
  }),
);

export type DailySnapshot = typeof dailySnapshots.$inferSelect;
export type DailySnapshotInsert = typeof dailySnapshots.$inferInsert;
export type SkillClusterSnapshot = typeof skillClusterSnapshots.$inferSelect;
export type AgencySnapshot = typeof agencySnapshots.$inferSelect;
export type SnapshotRun = typeof snapshotRuns.$inferSelect;
