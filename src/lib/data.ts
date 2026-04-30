/**
 * Read-side access to the v2 snapshot schema.
 *
 * Two flavours of reader:
 *   - Latest-only readers (`getSegmentDistribution`, `getGeography`, …) target
 *     the most recent snapshot. Used by sections that don't care about history.
 *   - Trend readers (`get<Thing>Trend(window)`) resolve a window of snapshots
 *     (start + end) and return start, end, and per-row deltas. Used by sections
 *     that surface a "Q1 / Since August" comparison.
 *
 * Each query is wrapped in safe() so a missing relation, transient connection
 * error, or schema drift returns empty/null instead of bubbling a 500 up to
 * the route. Sections render gracefully with no data; the benchmarking view
 * (which doesn't touch the DB) stays available.
 *
 * No computation here other than delta arithmetic — the heavy lifting (segment
 * classification, JSON artefacts) is done by the Python classifier Lambda.
 */
import "server-only";
import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  activeRoles,
  comparatorSegmentShares,
  geography,
  organisationBreakdown,
  segmentDistribution,
  segmentWindowAggregates,
  snapshots,
  sourceCoverage,
  type CollisionProfiles,
  type ConcurrencyTimeseries,
  type CutManifest,
  type HeadlineNumbers,
  type QoQChange,
  type SinceAugAggregates,
  type StaffVsConsultant,
} from "@/lib/db/schema";

export { SEGMENT_CODES, SEGMENT_LABELS, type SegmentCode } from "@/lib/segments";
export {
  parseWindow,
  WINDOW_KEYS,
  WINDOW_LABELS,
  type WindowKey,
} from "@/lib/window";
import type { WindowKey } from "@/lib/window";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(
      "[data] query failed:",
      err instanceof Error ? err.message : err,
    );
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Window resolution
// ---------------------------------------------------------------------------

const ANCHOR_DATE = "2025-08-01";

export interface ResolvedWindow {
  startDate: string;
  endDate: string;
  /** distinct snapshot dates between startDate and endDate inclusive, asc */
  inWindow: string[];
}

export function resolveWindow(
  window: WindowKey,
  availableDatesDesc: string[],
): ResolvedWindow | null {
  if (availableDatesDesc.length === 0) return null;
  const endDate = availableDatesDesc[0]!;

  let startDate: string;
  if (window === "sinceAug") {
    const sinceAnchor = availableDatesDesc.filter((d) => d >= ANCHOR_DATE);
    startDate =
      sinceAnchor[sinceAnchor.length - 1] ??
      availableDatesDesc[availableDatesDesc.length - 1]!;
  } else {
    startDate = availableDatesDesc[1] ?? endDate;
  }

  const inWindow = availableDatesDesc
    .filter((d) => d >= startDate && d <= endDate)
    .sort();
  return { startDate, endDate, inWindow };
}

function sampleEvenly<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items.slice();
  if (n <= 1) return items.length > 0 ? [items[items.length - 1]!] : [];
  const step = (items.length - 1) / (n - 1);
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(items[Math.round(i * step)]!);
  return out;
}

// ---------------------------------------------------------------------------
// Snapshot date helpers
// ---------------------------------------------------------------------------

export async function getAvailableSnapshotDates(): Promise<string[]> {
  return safe(async () => {
    const rows = await db
      .select({ d: snapshots.snapshotDate })
      .from(snapshots)
      .orderBy(desc(snapshots.snapshotDate));
    return rows.map((r) => r.d);
  }, []);
}

async function getLatestDate(asOf?: string): Promise<string | null> {
  return safe<string | null>(async () => {
    const q = db
      .select({ d: snapshots.snapshotDate })
      .from(snapshots)
      .orderBy(desc(snapshots.snapshotDate))
      .limit(1);
    const rows = await (asOf
      ? q.where(lte(snapshots.snapshotDate, asOf))
      : q);
    return rows[0]?.d ?? null;
  }, null);
}

export async function getLatestSnapshotDate(): Promise<string | null> {
  return getLatestDate();
}

type SnapshotRow = typeof snapshots.$inferSelect;

async function getSnapshotRow(asOf?: string): Promise<SnapshotRow | null> {
  return safe<SnapshotRow | null>(async () => {
    const q = db
      .select()
      .from(snapshots)
      .orderBy(desc(snapshots.snapshotDate))
      .limit(1);
    const rows = await (asOf
      ? q.where(lte(snapshots.snapshotDate, asOf))
      : q);
    return rows[0] ?? null;
  }, null);
}

// ---------------------------------------------------------------------------
// Latest-only readers
// ---------------------------------------------------------------------------

export interface SnapshotMeta {
  snapshotDate: string;
  computedAt: string;
  classifierVersionSha: string;
  totalPostings: number;
  digitalPostings: number;
  digitalSharePct: number;
  organisationsRepresented: number;
}

export async function getSnapshotMeta(): Promise<SnapshotMeta | null> {
  const row = await getSnapshotRow();
  if (!row) return null;
  return {
    snapshotDate: row.snapshotDate,
    computedAt:
      row.computedAt instanceof Date
        ? row.computedAt.toISOString()
        : String(row.computedAt),
    classifierVersionSha: row.classifierVersionSha,
    totalPostings: row.totalPostings,
    digitalPostings: row.digitalPostings,
    digitalSharePct: Number(row.digitalSharePct),
    organisationsRepresented: row.organisationsRepresented,
  };
}

export async function getHeadlineNumbers(): Promise<HeadlineNumbers | null> {
  const row = await getSnapshotRow();
  return row?.headlineNumbers ?? null;
}

export async function getCutManifest(): Promise<CutManifest | null> {
  const row = await getSnapshotRow();
  return row?.cutManifest ?? null;
}

export async function getConcurrencyTimeseries(): Promise<ConcurrencyTimeseries | null> {
  const row = await getSnapshotRow();
  return row?.concurrencyTimeseries ?? null;
}

export async function getQoQChange(): Promise<QoQChange | null> {
  const row = await getSnapshotRow();
  return row?.qoqChange ?? null;
}

export async function getCollisionProfiles(): Promise<CollisionProfiles | null> {
  const row = await getSnapshotRow();
  return row?.collisionProfiles ?? null;
}

export async function getStaffVsConsultant(): Promise<StaffVsConsultant | null> {
  const row = await getSnapshotRow();
  return row?.staffVsConsultant ?? null;
}

export type { SinceAugAggregates } from "@/lib/db/schema";

export async function getSinceAugAggregates(): Promise<SinceAugAggregates | null> {
  const row = await getSnapshotRow();
  return row?.sinceAugAggregates ?? null;
}

// ---------------------------------------------------------------------------
// Per-table fetch helpers — parameterised so trend readers can reuse them.
// ---------------------------------------------------------------------------

export interface SegmentDistributionRow {
  segment: string;
  count: number;
  shareOfDigital: number | null;
  shareOfAll: number;
}

async function fetchSegmentDistribution(
  snapshotDate: string,
): Promise<SegmentDistributionRow[]> {
  return safe(async () => {
    const rows = await db
      .select()
      .from(segmentDistribution)
      .where(eq(segmentDistribution.snapshotDate, snapshotDate));
    return rows.map((r) => ({
      segment: r.segment,
      count: r.count,
      shareOfDigital:
        r.shareOfDigital != null ? Number(r.shareOfDigital) : null,
      shareOfAll: Number(r.shareOfAll),
    }));
  }, []);
}

export async function getSegmentDistribution(): Promise<SegmentDistributionRow[]> {
  const d = await getLatestDate();
  if (!d) return [];
  return fetchSegmentDistribution(d);
}

export interface OrganisationBreakdownRow {
  organisation: string;
  totalPostings: number;
  digitalPostings: number;
  digitalShare: number;
  topSegment1: string | null;
  topSegment2: string | null;
  topSegment3: string | null;
}

async function fetchOrganisationBreakdown(
  snapshotDate: string,
): Promise<OrganisationBreakdownRow[]> {
  return safe(async () => {
    const rows = await db
      .select()
      .from(organisationBreakdown)
      .where(eq(organisationBreakdown.snapshotDate, snapshotDate))
      .orderBy(desc(organisationBreakdown.digitalPostings));
    return rows.map((r) => ({
      organisation: r.organisation,
      totalPostings: r.totalPostings,
      digitalPostings: r.digitalPostings,
      digitalShare: Number(r.digitalShare),
      topSegment1: r.topSegment1,
      topSegment2: r.topSegment2,
      topSegment3: r.topSegment3,
    }));
  }, []);
}

export async function getOrganisationBreakdown(): Promise<OrganisationBreakdownRow[]> {
  const d = await getLatestDate();
  if (!d) return [];
  return fetchOrganisationBreakdown(d);
}

export interface GeographyRow {
  locationOrCountry: string;
  count: number;
  share: number;
  topSegment: string | null;
  topSegments: string[];
  organisationCount: number;
}

async function fetchGeography(snapshotDate: string): Promise<GeographyRow[]> {
  return safe(async () => {
    const rows = await db
      .select()
      .from(geography)
      .where(eq(geography.snapshotDate, snapshotDate))
      .orderBy(desc(geography.count));
    return rows.map((r) => ({
      locationOrCountry: r.locationOrCountry,
      count: r.count,
      share: Number(r.share),
      topSegment: r.topSegment,
      topSegments: r.topSegments ?? (r.topSegment ? [r.topSegment] : []),
      organisationCount: r.organisationCount ?? 0,
    }));
  }, []);
}

export async function getGeography(): Promise<GeographyRow[]> {
  const d = await getLatestDate();
  if (!d) return [];
  return fetchGeography(d);
}

export interface ComparatorShareRow {
  segment: string;
  primaryCount: number;
  primaryShare: number;
  comparatorCount: number;
  comparatorShare: number;
  deltaPp: number;
}

export async function getComparatorShares(): Promise<ComparatorShareRow[]> {
  return safe(async () => {
    const d = await getLatestDate();
    if (!d) return [];
    const rows = await db
      .select()
      .from(comparatorSegmentShares)
      .where(eq(comparatorSegmentShares.snapshotDate, d));
    return rows.map((r) => ({
      segment: r.segment,
      primaryCount: r.primaryCount,
      primaryShare: Number(r.primaryShare),
      comparatorCount: r.comparatorCount,
      comparatorShare: Number(r.comparatorShare),
      deltaPp: Number(r.deltaPp),
    }));
  }, []);
}

export interface SourceCoverageRow {
  source: string;
  totalCount: number;
  digitalCount: number;
  shareOfDigital: number;
}

export async function getSourceCoverage(): Promise<SourceCoverageRow[]> {
  return safe(async () => {
    const d = await getLatestDate();
    if (!d) return [];
    const rows = await db
      .select()
      .from(sourceCoverage)
      .where(eq(sourceCoverage.snapshotDate, d))
      .orderBy(desc(sourceCoverage.totalCount));
    return rows.map((r) => ({
      source: r.source,
      totalCount: r.totalCount,
      digitalCount: r.digitalCount,
      shareOfDigital: Number(r.shareOfDigital),
    }));
  }, []);
}

export interface SegmentWindowPoint {
  segment: string;
  roles: number;
  orgs: number;
}

export async function getSegmentWindowAggregates(opts: {
  windowDays: 30 | 60 | 90;
}): Promise<SegmentWindowPoint[]> {
  return safe(async () => {
    const d = await getLatestDate();
    if (!d) return [];
    const rows = await db
      .select()
      .from(segmentWindowAggregates)
      .where(
        and(
          eq(segmentWindowAggregates.snapshotDate, d),
          eq(segmentWindowAggregates.windowDays, opts.windowDays),
        ),
      )
      .orderBy(segmentWindowAggregates.segment);
    return rows.map((r) => ({
      segment: r.segment,
      roles: r.roleCount,
      orgs: r.orgCount,
    }));
  }, []);
}

export interface ActiveRoleRow {
  roleId: string;
  title: string;
  organisation: string;
  segment: string;
  location: string | null;
  postedDate: string | null;
  closingDate: string | null;
  sourceUrl: string | null;
  level: string | null;
}

export async function getActiveRoles(filter?: {
  segment?: string;
  windowDays?: 30 | 60;
}): Promise<ActiveRoleRow[]> {
  return safe(async () => {
    const conditions = [] as ReturnType<typeof sql>[];
    if (filter?.segment) {
      conditions.push(sql`${activeRoles.segment} = ${filter.segment}`);
    }
    if (filter?.windowDays) {
      // pg binds windowDays as 'unknown', which makes `date + unknown`
      // ambiguous to Postgres ("operator is not unique"). Cast explicitly
      // to int so the date + int operator is selected.
      conditions.push(
        sql`${activeRoles.closingDate} is not null and ${activeRoles.closingDate} <= current_date + (${filter.windowDays})::int`,
      );
    }
    const whereClause =
      conditions.length > 0 ? sql.join(conditions, sql` and `) : undefined;

    const query = db.select().from(activeRoles);
    const rows = await (whereClause ? query.where(whereClause) : query).orderBy(
      activeRoles.closingDate,
    );
    return rows.map((r) => ({
      roleId: r.roleId,
      title: r.title,
      organisation: r.organisation,
      segment: r.segment,
      location: r.location,
      postedDate: r.postedDate,
      closingDate: r.closingDate,
      sourceUrl: r.sourceUrl,
      level: r.level,
    }));
  }, []);
}

// ---------------------------------------------------------------------------
// Q1↔Q4 KPI strip
// ---------------------------------------------------------------------------

export interface KpiComparison {
  digitalRoles: {
    q1: number;
    q4: number | null;
    deltaPct: number | null;
  };
  organisationsHiring: number;
  topMover: {
    segment: string;
    deltaPp: number;
  } | null;
}

export async function getKpiComparison(): Promise<KpiComparison | null> {
  const row = await getSnapshotRow();
  if (!row) return null;
  const q4Digital = row.headlineNumbers?.comparator?.digital_postings ?? null;
  const q1Digital = row.digitalPostings;
  const deltaPct =
    q4Digital && q4Digital > 0
      ? ((q1Digital - q4Digital) / q4Digital) * 100
      : null;

  const comparators = await safe(
    async () =>
      db
        .select()
        .from(comparatorSegmentShares)
        .where(eq(comparatorSegmentShares.snapshotDate, row.snapshotDate)),
    [] as Array<typeof comparatorSegmentShares.$inferSelect>,
  );

  let topMover: KpiComparison["topMover"] = null;
  if (comparators.length > 0) {
    const sorted = [...comparators].sort(
      (a, b) => Math.abs(Number(b.deltaPp)) - Math.abs(Number(a.deltaPp)),
    );
    const top = sorted[0];
    if (top && Math.abs(Number(top.deltaPp)) > 0.05) {
      topMover = { segment: top.segment, deltaPp: Number(top.deltaPp) };
    }
  }

  return {
    digitalRoles: { q1: q1Digital, q4: q4Digital, deltaPct },
    organisationsHiring: row.organisationsRepresented,
    topMover,
  };
}

// ---------------------------------------------------------------------------
// Trend readers
// ---------------------------------------------------------------------------

export interface TrendDelta {
  delta: number;
  deltaPct: number | null;
}

function diff(end: number, start: number): TrendDelta {
  const delta = end - start;
  const deltaPct = start === 0 ? null : (delta / start) * 100;
  return { delta, deltaPct };
}

export interface SegmentDistributionTrend {
  startDate: string;
  endDate: string;
  end: SegmentDistributionRow[];
  start: SegmentDistributionRow[];
  deltas: Record<string, TrendDelta>;
  samplePoints: { snapshotDate: string; segment: string; count: number }[];
}

export async function getSegmentDistributionTrend(
  window: WindowKey,
): Promise<SegmentDistributionTrend | null> {
  const dates = await getAvailableSnapshotDates();
  const w = resolveWindow(window, dates);
  if (!w) return null;

  const sampleDates = sampleEvenly(w.inWindow, 10);
  const [endRows, startRows, sampleRows] = await Promise.all([
    fetchSegmentDistribution(w.endDate),
    w.startDate === w.endDate
      ? Promise.resolve([] as SegmentDistributionRow[])
      : fetchSegmentDistribution(w.startDate),
    sampleDates.length > 0
      ? safe(
          async () =>
            db
              .select({
                snapshotDate: segmentDistribution.snapshotDate,
                segment: segmentDistribution.segment,
                count: segmentDistribution.count,
              })
              .from(segmentDistribution)
              .where(inArray(segmentDistribution.snapshotDate, sampleDates)),
          [] as { snapshotDate: string; segment: string; count: number }[],
        )
      : Promise.resolve([] as { snapshotDate: string; segment: string; count: number }[]),
  ]);

  const startBySeg = new Map(startRows.map((r) => [r.segment, r]));
  const deltas: Record<string, TrendDelta> = {};
  for (const r of endRows) {
    const s = startBySeg.get(r.segment);
    deltas[r.segment] = diff(r.count, s?.count ?? r.count);
  }

  return {
    startDate: w.startDate,
    endDate: w.endDate,
    end: endRows,
    start: startRows.length > 0 ? startRows : endRows,
    deltas,
    samplePoints: sampleRows
      .map((r) => ({
        snapshotDate: r.snapshotDate,
        segment: r.segment,
        count: r.count,
      }))
      .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate)),
  };
}

export interface GeographyTrend {
  startDate: string;
  endDate: string;
  end: GeographyRow[];
  start: GeographyRow[];
  deltas: Record<string, TrendDelta>;
}

export async function getGeographyTrend(
  window: WindowKey,
): Promise<GeographyTrend | null> {
  const dates = await getAvailableSnapshotDates();
  const w = resolveWindow(window, dates);
  if (!w) return null;

  const [endRows, startRows] = await Promise.all([
    fetchGeography(w.endDate),
    w.startDate === w.endDate
      ? Promise.resolve([] as GeographyRow[])
      : fetchGeography(w.startDate),
  ]);

  const startByLoc = new Map(startRows.map((r) => [r.locationOrCountry, r]));
  const deltas: Record<string, TrendDelta> = {};
  for (const r of endRows) {
    const s = startByLoc.get(r.locationOrCountry);
    deltas[r.locationOrCountry] = diff(r.count, s?.count ?? r.count);
  }

  return {
    startDate: w.startDate,
    endDate: w.endDate,
    end: endRows,
    start: startRows.length > 0 ? startRows : endRows,
    deltas,
  };
}

export interface OrganisationBreakdownTrend {
  startDate: string;
  endDate: string;
  end: OrganisationBreakdownRow[];
  start: OrganisationBreakdownRow[];
  deltas: Record<string, TrendDelta>;
}

export async function getOrganisationBreakdownTrend(
  window: WindowKey,
): Promise<OrganisationBreakdownTrend | null> {
  const dates = await getAvailableSnapshotDates();
  const w = resolveWindow(window, dates);
  if (!w) return null;

  const [endRows, startRows] = await Promise.all([
    fetchOrganisationBreakdown(w.endDate),
    w.startDate === w.endDate
      ? Promise.resolve([] as OrganisationBreakdownRow[])
      : fetchOrganisationBreakdown(w.startDate),
  ]);

  const startByOrg = new Map(startRows.map((r) => [r.organisation, r]));
  const deltas: Record<string, TrendDelta> = {};
  for (const r of endRows) {
    const s = startByOrg.get(r.organisation);
    deltas[r.organisation] = diff(
      r.digitalPostings,
      s?.digitalPostings ?? r.digitalPostings,
    );
  }

  return {
    startDate: w.startDate,
    endDate: w.endDate,
    end: endRows,
    start: startRows.length > 0 ? startRows : endRows,
    deltas,
  };
}

export interface OrgMoverRow {
  organisation: string;
  startCount: number;
  endCount: number;
  delta: number;
  topSegment: string | null;
}

export interface OrgMovers {
  startDate: string;
  endDate: string;
  risers: OrgMoverRow[];
  fallers: OrgMoverRow[];
}

/**
 * Top digital-postings risers and fallers across organisations between the
 * widest available snapshot pair (anchored at "since August"). The classifier
 * targets Q1 only for organisation_breakdown, so this surfaces intra-Q1
 * movement — Q4 org-level breakdown is not stored.
 */
export async function getOrgMovers(top = 3): Promise<OrgMovers | null> {
  const trend = await getOrganisationBreakdownTrend("sinceAug");
  if (!trend) return null;

  const startByOrg = new Map(trend.start.map((r) => [r.organisation, r]));
  const candidates: OrgMoverRow[] = trend.end.map((r) => {
    const s = startByOrg.get(r.organisation);
    return {
      organisation: r.organisation,
      startCount: s?.digitalPostings ?? 0,
      endCount: r.digitalPostings,
      delta: r.digitalPostings - (s?.digitalPostings ?? 0),
      topSegment: r.topSegment1,
    };
  });

  const risers = [...candidates]
    .filter((m) => m.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, top);
  const fallers = [...candidates]
    .filter((m) => m.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, top);

  return {
    startDate: trend.startDate,
    endDate: trend.endDate,
    risers,
    fallers,
  };
}

export interface CollisionProfilesTrend {
  startDate: string;
  endDate: string;
  end: CollisionProfiles | null;
  start: CollisionProfiles | null;
  /** keyed by canonical_title */
  deltas: Record<string, TrendDelta>;
}

export async function getCollisionProfilesTrend(
  window: WindowKey,
): Promise<CollisionProfilesTrend | null> {
  const dates = await getAvailableSnapshotDates();
  const w = resolveWindow(window, dates);
  if (!w) return null;

  const [endRow, startRow] = await Promise.all([
    getSnapshotRow(w.endDate),
    w.startDate === w.endDate
      ? Promise.resolve(null)
      : getSnapshotRow(w.startDate),
  ]);

  const end = endRow?.collisionProfiles ?? null;
  const start = startRow?.collisionProfiles ?? null;
  const startByTitle = new Map(
    (start?.profiles ?? []).map((p) => [
      p.canonical_title,
      p.organisation_count,
    ]),
  );
  const deltas: Record<string, TrendDelta> = {};
  for (const p of end?.profiles ?? []) {
    const s = startByTitle.get(p.canonical_title);
    deltas[p.canonical_title] = diff(
      p.organisation_count,
      s ?? p.organisation_count,
    );
  }

  return {
    startDate: w.startDate,
    endDate: w.endDate,
    end,
    start: start ?? end,
    deltas,
  };
}

export interface StaffVsConsultantTrend {
  startDate: string;
  endDate: string;
  end: StaffVsConsultant | null;
  start: StaffVsConsultant | null;
  /** keyed by segment; delta is in percentage points (consultant_share_pct) */
  deltas: Record<string, TrendDelta>;
}

export async function getStaffVsConsultantTrend(
  window: WindowKey,
): Promise<StaffVsConsultantTrend | null> {
  const dates = await getAvailableSnapshotDates();
  const w = resolveWindow(window, dates);
  if (!w) return null;

  const [endRow, startRow] = await Promise.all([
    getSnapshotRow(w.endDate),
    w.startDate === w.endDate
      ? Promise.resolve(null)
      : getSnapshotRow(w.startDate),
  ]);

  const end = endRow?.staffVsConsultant ?? null;
  const start = startRow?.staffVsConsultant ?? null;
  const startBySeg = new Map(
    (start?.segments ?? []).map((s) => [s.segment, s.consultant_share_pct]),
  );
  const deltas: Record<string, TrendDelta> = {};
  for (const s of end?.segments ?? []) {
    const prev = startBySeg.get(s.segment);
    deltas[s.segment] = diff(
      s.consultant_share_pct,
      prev ?? s.consultant_share_pct,
    );
  }

  return {
    startDate: w.startDate,
    endDate: w.endDate,
    end,
    start: start ?? end,
    deltas,
  };
}

// ---------------------------------------------------------------------------
// Since-August adapter
// ---------------------------------------------------------------------------

export interface SinceAugTrends {
  period: { from: string; to: string };
  segTrend: SegmentDistributionTrend;
  orgTrend: OrganisationBreakdownTrend;
  geoTrend: GeographyTrend;
}

/**
 * Adapt the since-Aug aggregates into the same Trend shape the sections
 * already consume. start === end so no delta badges render — the wider
 * window is the headline, not the within-window movement.
 */
export async function getSinceAugTrends(): Promise<SinceAugTrends | null> {
  const aggregates = await getSinceAugAggregates();
  if (!aggregates) return null;
  const { period, totals } = aggregates;

  const segDist: SegmentDistributionRow[] = aggregates.segments.map((s) => ({
    segment: s.segment,
    count: s.count,
    shareOfDigital: s.share_of_digital,
    shareOfAll:
      totals.total_postings > 0
        ? (s.count / totals.total_postings) * 100
        : 0,
  }));
  if (totals.total_postings > totals.digital_postings) {
    const nd = totals.total_postings - totals.digital_postings;
    segDist.push({
      segment: "NOT_DIGITAL",
      count: nd,
      shareOfDigital: null,
      shareOfAll: (nd / totals.total_postings) * 100,
    });
  }

  const orgRows: OrganisationBreakdownRow[] = aggregates.organisations.map(
    (o) => ({
      organisation: o.organisation,
      totalPostings: o.total_postings,
      digitalPostings: o.digital_postings,
      digitalShare: o.digital_share,
      topSegment1: o.top_segment_1,
      topSegment2: o.top_segment_2,
      topSegment3: o.top_segment_3,
    }),
  );

  const geoRows: GeographyRow[] = aggregates.geography.map((g) => ({
    locationOrCountry: g.location_or_country,
    count: g.count,
    share: g.share,
    topSegment: g.top_segment,
    topSegments: g.top_segments,
    organisationCount: g.organisation_count,
  }));

  return {
    period,
    segTrend: {
      startDate: period.from,
      endDate: period.to,
      end: segDist,
      start: segDist,
      deltas: {},
      samplePoints: [],
    },
    orgTrend: {
      startDate: period.from,
      endDate: period.to,
      end: orgRows,
      start: orgRows,
      deltas: {},
    },
    geoTrend: {
      startDate: period.from,
      endDate: period.to,
      end: geoRows,
      start: geoRows,
      deltas: {},
    },
  };
}
