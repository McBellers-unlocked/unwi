/**
 * Read-side access to the snapshot tables.
 *
 * Everything here is called from server components in the dashboard. Queries
 * are narrow and indexed; the raw_metrics JSONB is only unpacked when a module
 * actually needs a nested array.
 */
import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  agencySnapshots,
  dailySnapshots,
  skillClusterSnapshots,
  snapshotRuns,
} from "@/lib/db/schema";
import type {
  AgencyFingerprint,
  ObservatoryFindings,
} from "@/lib/compute/types";

export interface LatestDaily {
  snapshotDate: string;
  totalActivePosts: number;
  totalYtdPosts: number;
  distinctAgencies: number;
  digitalPostsCount: number;
  digitalPostsSharePct: number;
  duplicationEventsCount: number;
  duplicationCostEur: number;
  medianTimeToCloseDays: number | null;
  hqConcentrationPct: number | null;
  rawMetrics: ObservatoryFindings;
  computedAt: string;
}

export async function getLatestDailySnapshot(): Promise<LatestDaily | null> {
  const rows = await db
    .select()
    .from(dailySnapshots)
    .orderBy(desc(dailySnapshots.snapshotDate))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    snapshotDate: row.snapshotDate,
    totalActivePosts: row.totalActivePosts,
    totalYtdPosts: row.totalYtdPosts,
    distinctAgencies: row.distinctAgencies,
    digitalPostsCount: row.digitalPostsCount,
    digitalPostsSharePct: Number(row.digitalPostsSharePct),
    duplicationEventsCount: row.duplicationEventsCount,
    duplicationCostEur: Number(row.duplicationCostEur),
    medianTimeToCloseDays: row.medianTimeToCloseDays,
    hqConcentrationPct:
      row.hqConcentrationPct != null ? Number(row.hqConcentrationPct) : null,
    rawMetrics: row.rawMetrics,
    computedAt:
      row.computedAt instanceof Date
        ? row.computedAt.toISOString()
        : String(row.computedAt),
  };
}

export interface AgencySnapshotRow extends AgencyFingerprint {
  snapshotDate: string;
}

export async function getLatestAgencySnapshots(): Promise<AgencySnapshotRow[]> {
  const latest = await db
    .select({ d: sql<string>`max(${agencySnapshots.snapshotDate})` })
    .from(agencySnapshots);
  const latestDate = latest[0]?.d;
  if (!latestDate) return [];
  const rows = await db
    .select()
    .from(agencySnapshots)
    .where(eq(agencySnapshots.snapshotDate, latestDate));
  return rows.map((r) => ({
    snapshotDate: r.snapshotDate,
    organization: r.organization,
    totalActivePosts: r.totalActivePosts,
    pLevelPosts: r.pLevelPosts,
    hqPosts: r.hqPosts,
    fieldPosts: r.fieldPosts,
    medianTimeToCloseDays: r.medianTimeToCloseDays,
    repostingRatePct:
      r.repostingRatePct != null ? Number(r.repostingRatePct) : null,
    consultantRatioPct:
      r.consultantRatioPct != null ? Number(r.consultantRatioPct) : null,
    topSkillClusters: r.topSkillClusters ?? [],
  }));
}

export interface SkillHistoryPoint {
  snapshotDate: string;
  skillCluster: string;
  postCount90d: number;
  postCount30d: number;
  postCountAllTime: number;
}

export async function getSkillHistory(): Promise<SkillHistoryPoint[]> {
  const rows = await db
    .select()
    .from(skillClusterSnapshots)
    .orderBy(skillClusterSnapshots.snapshotDate);
  return rows.map((r) => ({
    snapshotDate: r.snapshotDate,
    skillCluster: r.skillCluster,
    postCount90d: r.postCount90d,
    postCount30d: r.postCount30d,
    postCountAllTime: r.postCountAllTime,
  }));
}

export async function getLatestSuccessfulRunAt(): Promise<string | null> {
  const rows = await db
    .select({ finishedAt: snapshotRuns.finishedAt })
    .from(snapshotRuns)
    .where(eq(snapshotRuns.status, "success"))
    .orderBy(desc(snapshotRuns.finishedAt))
    .limit(1);
  const ts = rows[0]?.finishedAt;
  if (!ts) return null;
  return ts instanceof Date ? ts.toISOString() : String(ts);
}
