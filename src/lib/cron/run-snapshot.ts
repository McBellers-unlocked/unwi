/**
 * Shared cron orchestration. Called by both /api/cron/snapshot (EventBridge
 * daily trigger) and /api/cron/snapshot-manual (human-triggered seed).
 *
 * Flow:
 *   1. Insert snapshot_runs row with status='running'
 *   2. Pull full Supabase payload
 *   3. computeObservatoryData
 *   4. UPSERT into daily_snapshots, skill_cluster_snapshots, agency_snapshots
 *      keyed on natural PKs so re-runs overwrite today's figures cleanly
 *   5. UPDATE snapshot_runs with finished_at, rows_fetched, status
 *
 * If there's no prior skill_cluster_snapshots history when this runs, we
 * backfill one row per (month, cluster) from the raw posted_date feed so the
 * trend line has depth on first deploy.
 */
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  agencySnapshots,
  dailySnapshots,
  skillClusterSnapshots,
  snapshotRuns,
} from "@/lib/db/schema";
import { computeObservatoryData } from "@/lib/compute/observatory";
import { fetchAllJobs } from "@/lib/supabase";
import type { ObservatoryFindings } from "@/lib/compute/types";

export interface RunResult {
  runId: number;
  status: "success" | "failed";
  rowsFetched: number;
  findings?: ObservatoryFindings;
  error?: string;
  startedAt: string;
  finishedAt: string;
  backfilledHistoryRows?: number;
}

export async function runSnapshot(): Promise<RunResult> {
  const startedAt = new Date();

  // 1) Ledger: mark running
  const [run] = await db
    .insert(snapshotRuns)
    .values({ status: "running" })
    .returning({ id: snapshotRuns.id });
  const runId = run!.id;

  try {
    // 2) Pull
    const jobs = await fetchAllJobs();

    // 3) Compute
    const findings = computeObservatoryData(jobs);

    // 4) UPSERT all three snapshot tables in one transaction
    let backfilledHistoryRows = 0;
    await db.transaction(async (tx) => {
      // 4a) daily_snapshots
      await tx
        .insert(dailySnapshots)
        .values({
          snapshotDate: findings.snapshotDate,
          totalActivePosts: findings.system.totalActivePosts,
          totalYtdPosts: findings.system.totalYtdPosts,
          distinctAgencies: findings.system.distinctAgencies,
          digitalPostsCount: findings.system.digitalPostsCount,
          digitalPostsSharePct: String(findings.system.digitalPostsSharePct),
          duplicationEventsCount: findings.system.duplicationEventsCount,
          duplicationCostEur: String(findings.system.duplicationCostEur),
          medianTimeToCloseDays: findings.system.medianTimeToCloseDays,
          hqConcentrationPct:
            findings.system.hqConcentrationPct != null
              ? String(findings.system.hqConcentrationPct)
              : null,
          rawMetrics: findings,
        })
        .onConflictDoUpdate({
          target: dailySnapshots.snapshotDate,
          set: {
            totalActivePosts: findings.system.totalActivePosts,
            totalYtdPosts: findings.system.totalYtdPosts,
            distinctAgencies: findings.system.distinctAgencies,
            digitalPostsCount: findings.system.digitalPostsCount,
            digitalPostsSharePct: String(findings.system.digitalPostsSharePct),
            duplicationEventsCount: findings.system.duplicationEventsCount,
            duplicationCostEur: String(findings.system.duplicationCostEur),
            medianTimeToCloseDays: findings.system.medianTimeToCloseDays,
            hqConcentrationPct:
              findings.system.hqConcentrationPct != null
                ? String(findings.system.hqConcentrationPct)
                : null,
            rawMetrics: findings,
            computedAt: sql`now()`,
          },
        });

      // 4b) skill_cluster_snapshots — today's counts
      for (const c of findings.skills.byCluster90d) {
        // Alltime uses the monthly history sum; 30d derived in-place from
        // annotated jobs would be cleaner but costs a second pass. For v0.1
        // we approximate 30d = 90d / 3 on today's row; if historical depth
        // matters more than today-precision, swap to exact 30d.
        await tx
          .insert(skillClusterSnapshots)
          .values({
            snapshotDate: findings.snapshotDate,
            skillCluster: c.cluster,
            postCount90d: c.count,
            postCount30d: Math.round(c.count / 3),
            postCountAllTime: sumMonthly(findings, c.cluster),
          })
          .onConflictDoUpdate({
            target: [
              skillClusterSnapshots.snapshotDate,
              skillClusterSnapshots.skillCluster,
            ],
            set: {
              postCount90d: c.count,
              postCount30d: Math.round(c.count / 3),
              postCountAllTime: sumMonthly(findings, c.cluster),
            },
          });
      }

      // 4c) Backfill monthly history if this is a first run or there are
      // fewer than 30 days of snapshot_cluster_snapshots. We write one row
      // per (month-start-date, cluster) with the month's total so the trend
      // chart has depth from day 1.
      const existing = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(skillClusterSnapshots);
      const existingCount = existing[0]?.n ?? 0;
      if (existingCount < 30 * Object.keys(findings.skills.monthly).length) {
        const byMonth = new Map<string, Map<string, number>>();
        for (const row of findings.skills.monthly) {
          if (row.month === findings.snapshotDate.slice(0, 7)) continue;
          let b = byMonth.get(row.month);
          if (!b) {
            b = new Map();
            byMonth.set(row.month, b);
          }
          b.set(row.cluster, row.count);
        }
        for (const [month, clusters] of byMonth) {
          const dateKey = `${month}-01`; // month-start date as the synthetic snapshot_date
          for (const [cluster, count] of clusters) {
            await tx
              .insert(skillClusterSnapshots)
              .values({
                snapshotDate: dateKey,
                skillCluster: cluster,
                postCount90d: count, // month total as 90d proxy for historic points
                postCount30d: count,
                postCountAllTime: count,
              })
              .onConflictDoNothing();
            backfilledHistoryRows += 1;
          }
        }
      }

      // 4d) agency_snapshots
      for (const a of findings.agencies) {
        await tx
          .insert(agencySnapshots)
          .values({
            snapshotDate: findings.snapshotDate,
            organization: a.organization,
            totalActivePosts: a.totalActivePosts,
            pLevelPosts: a.pLevelPosts,
            hqPosts: a.hqPosts,
            fieldPosts: a.fieldPosts,
            medianTimeToCloseDays: a.medianTimeToCloseDays,
            repostingRatePct:
              a.repostingRatePct != null ? String(a.repostingRatePct) : null,
            consultantRatioPct:
              a.consultantRatioPct != null ? String(a.consultantRatioPct) : null,
            topSkillClusters: a.topSkillClusters,
          })
          .onConflictDoUpdate({
            target: [agencySnapshots.snapshotDate, agencySnapshots.organization],
            set: {
              totalActivePosts: a.totalActivePosts,
              pLevelPosts: a.pLevelPosts,
              hqPosts: a.hqPosts,
              fieldPosts: a.fieldPosts,
              medianTimeToCloseDays: a.medianTimeToCloseDays,
              repostingRatePct:
                a.repostingRatePct != null ? String(a.repostingRatePct) : null,
              consultantRatioPct:
                a.consultantRatioPct != null
                  ? String(a.consultantRatioPct)
                  : null,
              topSkillClusters: a.topSkillClusters,
            },
          });
      }
    });

    // 5) Ledger: mark success
    const finishedAt = new Date();
    await db
      .update(snapshotRuns)
      .set({
        finishedAt,
        rowsFetched: jobs.length,
        status: "success",
      })
      .where(eq(snapshotRuns.id, runId));

    return {
      runId,
      status: "success",
      rowsFetched: jobs.length,
      findings,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      backfilledHistoryRows,
    };
  } catch (err) {
    const finishedAt = new Date();
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(snapshotRuns)
      .set({
        finishedAt,
        status: "failed",
        errorMessage: msg.slice(0, 2000),
      })
      .where(eq(snapshotRuns.id, runId));
    return {
      runId,
      status: "failed",
      rowsFetched: 0,
      error: msg,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
    };
  }
}

function sumMonthly(findings: ObservatoryFindings, cluster: string): number {
  let s = 0;
  for (const row of findings.skills.monthly) {
    if (row.cluster === cluster) s += row.count;
  }
  return s;
}
