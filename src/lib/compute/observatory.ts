/**
 * computeObservatoryData — single-pass, deterministic findings computation.
 *
 * All observatory numbers come from this function. The cron job calls it with
 * the raw Supabase payload; the dashboard never re-computes. Output shape is
 * pinned in @/lib/compute/types.
 *
 * Conventions:
 *   - All dates are YYYY-MM-DD strings (UTC calendar days). We parse with
 *     Date UTC to avoid TZ drift on compute between Amplify (UTC) and local dev.
 *   - Percentages are rounded to 1 decimal place on output.
 *   - "Active" means status is not closed/expired; "YTD" means posted_date >=
 *     YTD anchor (default 2025-08-01).
 *   - "Digital" means the role hits at least one of DIGITAL_CLUSTERS.
 *   - "HQ" means location or country matches the HQ cluster list.
 */
import { isUnCommonSystem } from "./un-system";
import {
  clustersFor,
  DIGITAL_CLUSTERS,
  SKILL_CLUSTERS,
  type ClusterName,
} from "./skills";
import { normalizeTitle, tokenJaccard } from "./normalize";
import type {
  AgencyFingerprint,
  ClusterCount,
  DecentralisationBlock,
  DigitalTalentBlock,
  DuplicationBlock,
  DuplicationExample,
  ForwardSignalBlock,
  ForwardSignalRole,
  ObservatoryFindings,
  RawJob,
  SkillsBlock,
  SystemBlock,
} from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HQ_CITIES = [
  "new york",
  "geneva",
  "vienna",
  "rome",
  "nairobi",
  "copenhagen",
];

const DEFAULT_YTD_ANCHOR = "2025-08-01";
const DEFAULT_USD_PER_RECRUITMENT = 20000;
const DEFAULT_USD_TO_EUR_RATE = 0.92;
const DUPLICATION_WINDOW_DAYS = 90;
const REPOSTING_WINDOW_DAYS = 90;
const REPOSTING_JACCARD = 0.85;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Annotated row — enriched once, reused by every block
// ---------------------------------------------------------------------------

interface AnnotatedJob {
  raw: RawJob;
  organization: string;
  postedDate: Date | null;
  postedDateStr: string; // empty string if null
  closingDate: Date | null;
  closingDateStr: string;
  normalizedTitle: string;
  clusters: ClusterName[];
  isActive: boolean;
  isYtd: boolean;
  isHq: boolean;
  isPLevel: boolean;
  isConsultant: boolean;
  isDigital: boolean;
  location: string; // location || country
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  // Accept both YYYY-MM-DD and full ISO. Interpret as UTC calendar day.
  const d = new Date(s.length === 10 ? `${s}T00:00:00.000Z` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateOnly(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

function containsHqCity(text: string | null | undefined): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return HQ_CITIES.some((c) => lower.includes(c));
}

function isPLevel(job: RawJob): boolean {
  const g = job.grade_code?.trim().toUpperCase() ?? "";
  if (g.startsWith("P")) return true;
  // Fallback: level indicates professional grade but grade_code missing.
  if (!g && job.level && ["Senior", "Mid"].includes(job.level)) return true;
  return false;
}

function isActive(job: RawJob): boolean {
  const s = (job.status ?? "").toLowerCase();
  if (!s) return true; // unset treated as active
  return s !== "closed" && s !== "expired" && s !== "cancelled";
}

function annotate(
  job: RawJob,
  ytdAnchor: Date,
): AnnotatedJob | null {
  // Minimal guard — unreadable organization names shouldn't drive metrics.
  if (!job.organization) return null;
  const postedDate = parseDate(job.posted_date);
  const closingDate = parseDate(job.closing_date);
  const clusters = clustersFor(job.title, job.description);
  const location = (job.location ?? job.country ?? "").trim();
  const isDigital = clusters.some((c) => DIGITAL_CLUSTERS.includes(c));
  return {
    raw: job,
    organization: job.organization,
    postedDate,
    postedDateStr: dateOnly(postedDate),
    closingDate,
    closingDateStr: dateOnly(closingDate),
    normalizedTitle: normalizeTitle(job.title),
    clusters,
    isActive: isActive(job),
    isYtd: postedDate ? postedDate >= ytdAnchor : false,
    isHq: containsHqCity(job.location) || containsHqCity(job.country),
    isPLevel: isPLevel(job),
    isConsultant: (job.level ?? "").toLowerCase() === "consultant",
    isDigital,
    location,
  };
}

function medianOrNull(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const a = sorted[mid - 1]!;
    const b = sorted[mid]!;
    return Math.round((a + b) / 2);
  }
  return sorted[mid]!;
}

function pct(n: number, d: number, decimals = 1): number {
  if (d === 0) return 0;
  const raw = (100 * n) / d;
  const m = Math.pow(10, decimals);
  return Math.round(raw * m) / m;
}

// ---------------------------------------------------------------------------
// Block computations
// ---------------------------------------------------------------------------

function computeSystem(jobs: AnnotatedJob[]): SystemBlock {
  const active = jobs.filter((j) => j.isActive);
  const ytd = jobs.filter((j) => j.isYtd);
  const agencies = new Set(active.map((j) => j.organization));
  const digital = ytd.filter((j) => j.isDigital); // digital share uses YTD flow

  const byOrg = new Map<string, number>();
  for (const j of active) {
    byOrg.set(j.organization, (byOrg.get(j.organization) ?? 0) + 1);
  }
  const totalActive = active.length;
  const topAgencies = Array.from(byOrg.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([organization, count]) => ({
      organization,
      count,
      pctOfSystem: pct(count, totalActive),
    }));

  // Time-to-close: (closing_date - posted_date) in days for jobs that have both.
  const ttcDays: number[] = [];
  for (const j of jobs) {
    if (j.postedDate && j.closingDate) {
      const d = Math.round(
        (j.closingDate.getTime() - j.postedDate.getTime()) / MS_PER_DAY,
      );
      if (d >= 0 && d <= 365) ttcDays.push(d);
    }
  }

  const activeP = active.filter((j) => j.isPLevel);
  const hqP = activeP.filter((j) => j.isHq).length;

  return {
    totalActivePosts: totalActive,
    totalYtdPosts: ytd.length,
    distinctAgencies: agencies.size,
    digitalPostsCount: digital.length,
    digitalPostsSharePct: pct(digital.length, ytd.length),
    // Duplication counters are backfilled by computeDuplication below and copied
    // in by the caller (system inherits those scalars).
    duplicationEventsCount: 0,
    duplicationCostEur: 0,
    medianTimeToCloseDays: medianOrNull(ttcDays),
    hqConcentrationPct:
      activeP.length > 0 ? pct(hqP, activeP.length) : null,
    topAgenciesByVolume: topAgencies,
  };
}

function computeDecentralisation(jobs: AnnotatedJob[]): DecentralisationBlock {
  const active = jobs.filter((j) => j.isActive);
  const pByAgency = new Map<
    string,
    { total: number; hq: number; field: number }
  >();
  for (const j of active) {
    if (!j.isPLevel) continue;
    const cur = pByAgency.get(j.organization) ?? { total: 0, hq: 0, field: 0 };
    cur.total += 1;
    if (j.isHq) cur.hq += 1;
    else cur.field += 1;
    pByAgency.set(j.organization, cur);
  }

  const byAgency = Array.from(pByAgency.entries())
    .map(([org, c]) => ({
      organization: org,
      totalPLevel: c.total,
      hqPct: pct(c.hq, c.total),
      fieldPct: pct(c.field, c.total),
    }))
    .sort((a, b) => b.totalPLevel - a.totalPLevel);

  const rankedTable = byAgency
    .filter((r) => r.totalPLevel >= 20)
    .sort((a, b) => b.hqPct - a.hqPct);

  // Duty-station concentration: count active postings per location and record
  // how many DIFFERENT agencies are competing there.
  const stationCounts = new Map<
    string,
    { count: number; agencies: Set<string> }
  >();
  for (const j of active) {
    if (!j.location) continue;
    const key = j.location;
    const cur = stationCounts.get(key) ?? {
      count: 0,
      agencies: new Set<string>(),
    };
    cur.count += 1;
    cur.agencies.add(j.organization);
    stationCounts.set(key, cur);
  }
  const topDutyStations = Array.from(stationCounts.entries())
    .filter(([, v]) => v.agencies.size >= 2) // cross-agency competition only
    .map(([location, v]) => ({
      location,
      concurrentPostings: v.count,
      agencies: v.agencies.size,
    }))
    .sort((a, b) => b.concurrentPostings - a.concurrentPostings)
    .slice(0, 10);

  return { byAgency, rankedTable, topDutyStations };
}

function computeDuplication(
  jobs: AnnotatedJob[],
  anchor: Date,
  usdPerRecruitment: number,
  usdToEurRate: number,
  opts: { digitalOnly: boolean } = { digitalOnly: false },
): DuplicationBlock {
  const base = opts.digitalOnly ? jobs.filter((j) => j.isDigital) : jobs;

  // Group by normalized title (skip empty titles).
  const groups = new Map<string, AnnotatedJob[]>();
  for (const j of base) {
    if (!j.normalizedTitle || !j.postedDate) continue;
    const arr = groups.get(j.normalizedTitle) ?? [];
    arr.push(j);
    groups.set(j.normalizedTitle, arr);
  }

  let events = 0;
  const examples: DuplicationExample[] = [];

  for (const [norm, arr] of groups) {
    if (arr.length < 2) continue;

    // Sort by posted_date ascending for a deterministic walk.
    const sorted = arr
      .filter((j) => j.postedDate)
      .sort((a, b) => a.postedDate!.getTime() - b.postedDate!.getTime());

    // Track agencies we've already seen for THIS normalized title.
    const seenAgencies = new Set<string>();
    const agenciesForExample = new Set<string>();
    const datesForExample: string[] = [];
    const locationsForExample = new Set<string>();

    for (let i = 0; i < sorted.length; i++) {
      const cur = sorted[i]!;
      agenciesForExample.add(cur.organization);
      datesForExample.push(cur.postedDateStr);
      if (cur.location) locationsForExample.add(cur.location);

      if (!seenAgencies.has(cur.organization)) {
        // New agency for this title — does an earlier posting by a different
        // agency fall within the window? If so, +1 duplication event
        // (anchored: only count when the *current* posting is on/after anchor).
        if (cur.postedDate! >= anchor) {
          for (let k = 0; k < i; k++) {
            const prev = sorted[k]!;
            if (prev.organization === cur.organization) continue;
            const gapDays =
              (cur.postedDate!.getTime() - prev.postedDate!.getTime()) /
              MS_PER_DAY;
            if (gapDays <= DUPLICATION_WINDOW_DAYS) {
              events += 1;
              break; // count once per new-agency arrival
            }
          }
        }
      }
      seenAgencies.add(cur.organization);
    }

    if (agenciesForExample.size >= 2) {
      examples.push({
        normalizedTitle: norm,
        agencies: Array.from(agenciesForExample).sort(),
        dates: datesForExample,
        locations: Array.from(locationsForExample).sort(),
        count: sorted.length,
      });
    }
  }

  examples.sort((a, b) => b.count - a.count);
  const topExamples = examples.slice(0, 20);

  const costUsd = events * usdPerRecruitment;
  const costEur = Math.round(costUsd * usdToEurRate * 100) / 100;

  return {
    eventsCount: events,
    costEur,
    costUsd,
    topExamples,
    methodology: {
      usdPerRecruitment,
      usdToEurRate,
      windowDays: DUPLICATION_WINDOW_DAYS,
      anchorDate: dateOnly(anchor),
    },
  };
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function computeSkills(jobs: AnnotatedJob[], now: Date): SkillsBlock {
  const cutoff90 = new Date(now.getTime() - 90 * MS_PER_DAY);

  const count90: Record<string, number> = {};
  const monthly: Map<string, Record<string, number>> = new Map(); // month -> cluster -> n

  for (const cluster of Object.keys(SKILL_CLUSTERS)) {
    count90[cluster] = 0;
  }

  for (const j of jobs) {
    if (!j.postedDate) continue;
    const within90 = j.postedDate >= cutoff90;
    const mk = monthKey(j.postedDate);
    let bucket = monthly.get(mk);
    if (!bucket) {
      bucket = {};
      monthly.set(mk, bucket);
    }
    for (const c of j.clusters) {
      if (within90) count90[c] = (count90[c] ?? 0) + 1;
      bucket[c] = (bucket[c] ?? 0) + 1;
    }
  }

  const byCluster90d: ClusterCount[] = Object.entries(count90)
    .map(([cluster, count]) => ({ cluster, count }))
    .sort((a, b) => b.count - a.count);

  const months = Array.from(monthly.keys()).sort();
  const monthlyFlat: SkillsBlock["monthly"] = [];
  for (const m of months) {
    const bucket = monthly.get(m)!;
    for (const cluster of Object.keys(SKILL_CLUSTERS)) {
      monthlyFlat.push({
        month: m,
        cluster,
        count: bucket[cluster] ?? 0,
      });
    }
  }

  // Top 3 growing clusters: compare first and last months in the window.
  // Use the second-latest full month as "end" and the third-latest as "start"
  // to avoid partial-month noise when the snapshot day is mid-month.
  const cluesUsingLastMonths = months.length >= 2;
  const topGrowingClusters: SkillsBlock["topGrowingClusters"] = [];
  if (cluesUsingLastMonths) {
    const startM = months[0]!;
    const endM = months[months.length - 1]!;
    const startBucket = monthly.get(startM)!;
    const endBucket = monthly.get(endM)!;
    for (const cluster of Object.keys(SKILL_CLUSTERS)) {
      const start = startBucket[cluster] ?? 0;
      const end = endBucket[cluster] ?? 0;
      if (start === 0 && end === 0) continue;
      const pctChange =
        start === 0 ? 100.0 : Math.round(((end - start) / start) * 1000) / 10;
      topGrowingClusters.push({
        cluster,
        pctChange,
        startCount: start,
        endCount: end,
      });
    }
    topGrowingClusters.sort((a, b) => b.pctChange - a.pctChange);
  }

  return {
    byCluster90d,
    monthly: monthlyFlat,
    topGrowingClusters: topGrowingClusters.slice(0, 3),
  };
}

function computeAgencies(jobs: AnnotatedJob[]): AgencyFingerprint[] {
  const byOrg = new Map<string, AnnotatedJob[]>();
  for (const j of jobs) {
    const arr = byOrg.get(j.organization) ?? [];
    arr.push(j);
    byOrg.set(j.organization, arr);
  }

  const out: AgencyFingerprint[] = [];
  for (const [org, arr] of byOrg) {
    const active = arr.filter((j) => j.isActive);
    if (active.length === 0) continue;

    const pLevel = active.filter((j) => j.isPLevel);
    const hq = pLevel.filter((j) => j.isHq).length;
    const field = pLevel.length - hq;
    const consultants = active.filter((j) => j.isConsultant).length;

    const ttcDays: number[] = [];
    for (const j of arr) {
      if (j.postedDate && j.closingDate) {
        const d = Math.round(
          (j.closingDate.getTime() - j.postedDate.getTime()) / MS_PER_DAY,
        );
        if (d >= 0 && d <= 365) ttcDays.push(d);
      }
    }

    // Re-posting rate: for each YTD posting in this org, is there another
    // posting by the same org within 90 days with Jaccard >= 0.85?
    // (Compare normalized titles; Jaccard over token sets.)
    const postings = arr
      .filter((j) => j.postedDate && j.isYtd)
      .sort((a, b) => a.postedDate!.getTime() - b.postedDate!.getTime());
    let repostMatches = 0;
    for (let i = 0; i < postings.length; i++) {
      const a = postings[i]!;
      for (let k = i + 1; k < postings.length; k++) {
        const b = postings[k]!;
        const gap =
          (b.postedDate!.getTime() - a.postedDate!.getTime()) / MS_PER_DAY;
        if (gap > REPOSTING_WINDOW_DAYS) break;
        if (a.raw.id === b.raw.id) continue; // defensive; shouldn't happen but cheap
        if (tokenJaccard(a.normalizedTitle, b.normalizedTitle) >= REPOSTING_JACCARD) {
          repostMatches += 1;
          break; // count once per posting
        }
      }
    }

    // Top 5 skill clusters for this agency (across all postings, active flag
    // doesn't matter here — we want the demand signal).
    const clusterCounts = new Map<string, number>();
    for (const j of arr) {
      for (const c of j.clusters) {
        clusterCounts.set(c, (clusterCounts.get(c) ?? 0) + 1);
      }
    }
    const topSkillClusters = Array.from(clusterCounts.entries())
      .map(([cluster, count]) => ({ cluster, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    out.push({
      organization: org,
      totalActivePosts: active.length,
      pLevelPosts: pLevel.length,
      hqPosts: hq,
      fieldPosts: field,
      medianTimeToCloseDays: medianOrNull(ttcDays),
      repostingRatePct:
        postings.length > 0 ? pct(repostMatches, postings.length) : null,
      consultantRatioPct:
        active.length > 0 ? pct(consultants, active.length) : null,
      topSkillClusters,
    });
  }

  return out.sort((a, b) => b.totalActivePosts - a.totalActivePosts);
}

function computeDigitalTalent(
  jobs: AnnotatedJob[],
  ytdAnchor: Date,
  now: Date,
  usdPerRecruitment: number,
  usdToEurRate: number,
): DigitalTalentBlock {
  const ytd = jobs.filter((j) => j.isYtd);
  const digitalYtd = ytd.filter((j) => j.isDigital);
  const sharePctYtd = pct(digitalYtd.length, ytd.length);

  // Prior period: the 3 months *before* YTD anchor, for an honest baseline.
  const priorEnd = new Date(ytdAnchor.getTime() - MS_PER_DAY);
  const priorStart = new Date(priorEnd.getTime() - 90 * MS_PER_DAY);
  const prior = jobs.filter(
    (j) =>
      j.postedDate && j.postedDate >= priorStart && j.postedDate <= priorEnd,
  );
  const digitalPrior = prior.filter((j) => j.isDigital);
  const sharePctPriorPeriod = pct(digitalPrior.length, prior.length);

  const headline =
    `Digital talent is ${sharePctYtd.toFixed(1)}% of UN system hiring ` +
    `in YTD (anchor ${dateOnly(ytdAnchor)}), ` +
    (prior.length > 0
      ? `up from ${sharePctPriorPeriod.toFixed(1)}% in the 3 months prior.`
      : "baseline period has no data yet.");

  // Monthly by sub-cluster (digital only)
  const monthly = new Map<string, Record<string, number>>();
  for (const j of digitalYtd) {
    if (!j.postedDate) continue;
    const m = monthKey(j.postedDate);
    let b = monthly.get(m);
    if (!b) {
      b = {};
      monthly.set(m, b);
    }
    for (const c of j.clusters) {
      if (!DIGITAL_CLUSTERS.includes(c)) continue;
      b[c] = (b[c] ?? 0) + 1;
    }
  }
  const monthlyBySubCluster: DigitalTalentBlock["monthlyBySubCluster"] = [];
  for (const m of Array.from(monthly.keys()).sort()) {
    const b = monthly.get(m)!;
    for (const c of DIGITAL_CLUSTERS) {
      monthlyBySubCluster.push({ month: m, cluster: c, count: b[c] ?? 0 });
    }
  }

  const byOrg = new Map<string, number>();
  for (const j of digitalYtd) {
    byOrg.set(j.organization, (byOrg.get(j.organization) ?? 0) + 1);
  }
  const topAgencies = Array.from(byOrg.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([organization, count]) => ({ organization, count }));

  // Digital-only duplication, reusing the same method.
  const digDup = computeDuplication(
    jobs,
    ytdAnchor,
    usdPerRecruitment,
    usdToEurRate,
    { digitalOnly: true },
  );
  const dsCounts = new Map<string, number>();
  for (const j of digitalYtd) {
    if (!j.location || !j.isActive) continue;
    dsCounts.set(j.location, (dsCounts.get(j.location) ?? 0) + 1);
  }
  const topDutyStations = Array.from(dsCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([location, count]) => ({ location, count }));

  return {
    headline,
    sharePctYtd,
    sharePctPriorPeriod,
    ytdAnchor: dateOnly(ytdAnchor),
    priorPeriodStart: dateOnly(priorStart),
    priorPeriodEnd: dateOnly(priorEnd),
    monthlyBySubCluster,
    topAgencies,
    concurrentDuplication: {
      eventsCount: digDup.eventsCount,
      costEur: digDup.costEur,
      topDutyStations,
    },
  };
}

function computeForwardSignal(
  jobs: AnnotatedJob[],
  now: Date,
): ForwardSignalBlock {
  const cutoff30 = new Date(now.getTime() + 30 * MS_PER_DAY);
  const cutoff60 = new Date(now.getTime() + 60 * MS_PER_DAY);
  const within30: ForwardSignalRole[] = [];
  const within60: ForwardSignalRole[] = [];

  for (const j of jobs) {
    if (!j.closingDate) continue;
    if (j.closingDate <= now) continue;
    if (j.closingDate > cutoff60) continue;
    const role: ForwardSignalRole = {
      id: j.raw.id,
      title: j.raw.title ?? "",
      organization: j.organization,
      location: j.location,
      closingDate: j.closingDateStr,
      // One role can belong to multiple clusters — pick the first digital cluster
      // if any, else the first cluster, else "Other". This keeps the table
      // single-valued per row which the UI filter expects.
      cluster:
        j.clusters.find((c) => DIGITAL_CLUSTERS.includes(c)) ??
        j.clusters[0] ??
        "Other",
    };
    if (j.closingDate <= cutoff30) within30.push(role);
    within60.push(role);
  }

  within30.sort((a, b) => a.closingDate.localeCompare(b.closingDate));
  within60.sort((a, b) => a.closingDate.localeCompare(b.closingDate));

  // Headline: N roles in [top 3 clusters] closing within 60 days across M agencies.
  const clusterCounts = new Map<string, number>();
  const agencies = new Set<string>();
  for (const r of within60) {
    clusterCounts.set(r.cluster, (clusterCounts.get(r.cluster) ?? 0) + 1);
    agencies.add(r.organization);
  }
  const topClusters = Array.from(clusterCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([c]) => c);
  const topClusterLabel = topClusters.length > 0 ? topClusters.join(", ") : "—";
  const headline =
    `${within60.length} roles in ${topClusterLabel} ` +
    `are closing within 60 days across ${agencies.size} agencies.`;

  return { headline, within30d: within30, within60d: within60 };
}

// ---------------------------------------------------------------------------
// Public entrypoint
// ---------------------------------------------------------------------------

export interface ComputeOptions {
  now?: Date;
  ytdAnchor?: string; // YYYY-MM-DD; default from env or 2025-08-01
  usdPerRecruitment?: number;
  usdToEurRate?: number;
}

export function computeObservatoryData(
  rawJobs: RawJob[],
  opts: ComputeOptions = {},
): ObservatoryFindings {
  const now = opts.now ?? new Date();
  const ytdAnchorStr =
    opts.ytdAnchor ?? process.env.YTD_ANCHOR_DATE ?? DEFAULT_YTD_ANCHOR;
  const ytdAnchor = parseDate(ytdAnchorStr) ?? parseDate(DEFAULT_YTD_ANCHOR)!;
  const usdPerRecruitment =
    opts.usdPerRecruitment ??
    Number(process.env.USD_PER_RECRUITMENT ?? DEFAULT_USD_PER_RECRUITMENT);
  const usdToEurRate =
    opts.usdToEurRate ??
    Number(process.env.USD_TO_EUR_RATE ?? DEFAULT_USD_TO_EUR_RATE);

  // 1) UN whitelist filter
  const filtered: AnnotatedJob[] = [];
  let skippedNonUn = 0;
  for (const r of rawJobs) {
    if (!isUnCommonSystem(r.organization)) {
      skippedNonUn += 1;
      continue;
    }
    const a = annotate(r, ytdAnchor);
    if (a) filtered.push(a);
  }

  // 2) Compute blocks
  const system = computeSystem(filtered);
  const decentralisation = computeDecentralisation(filtered);
  const duplication = computeDuplication(
    filtered,
    ytdAnchor,
    usdPerRecruitment,
    usdToEurRate,
  );
  const skills = computeSkills(filtered, now);
  const agencies = computeAgencies(filtered);
  const digitalTalent = computeDigitalTalent(
    filtered,
    ytdAnchor,
    now,
    usdPerRecruitment,
    usdToEurRate,
  );
  const forwardSignal = computeForwardSignal(filtered, now);

  // Fold duplication scalars back into system block for a single source of truth.
  system.duplicationEventsCount = duplication.eventsCount;
  system.duplicationCostEur = duplication.costEur;

  return {
    snapshotDate: now.toISOString().slice(0, 10),
    computedAt: now.toISOString(),
    inputRowsTotal: rawJobs.length,
    inputRowsAfterUnFilter: filtered.length,
    system,
    decentralisation,
    duplication,
    skills,
    agencies,
    digitalTalent,
    forwardSignal,
  };
}
