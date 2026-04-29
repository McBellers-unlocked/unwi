/**
 * Read-side access to the v2 snapshot schema.
 *
 * All functions target the latest snapshot_date. No computation here —
 * everything is written by the Python classifier Lambda.
 *
 * Each query is wrapped so a missing relation, transient connection
 * error, or schema drift returns empty/null instead of bubbling a 500
 * up to the route. Sections render gracefully with no data; the
 * benchmarking view (which doesn't touch the DB) stays available.
 */
import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
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
  type StaffVsConsultant,
} from "@/lib/db/schema";

export { SEGMENT_CODES, SEGMENT_LABELS, type SegmentCode } from "@/lib/segments";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error("[data] query failed:", err instanceof Error ? err.message : err);
    return fallback;
  }
}

async function getLatestDate(): Promise<string | null> {
  return safe(async () => {
    const rows = await db
      .select({ d: snapshots.snapshotDate })
      .from(snapshots)
      .orderBy(desc(snapshots.snapshotDate))
      .limit(1);
    return rows[0]?.d ?? null;
  }, null);
}

export async function getLatestSnapshotDate(): Promise<string | null> {
  return getLatestDate();
}

type SnapshotRow = typeof snapshots.$inferSelect;

async function getSnapshotRow(): Promise<SnapshotRow | null> {
  return safe<SnapshotRow | null>(async () => {
    const rows = await db
      .select()
      .from(snapshots)
      .orderBy(desc(snapshots.snapshotDate))
      .limit(1);
    return rows[0] ?? null;
  }, null);
}

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

export interface SegmentDistributionRow {
  segment: string;
  count: number;
  shareOfDigital: number | null;
  shareOfAll: number;
}

export async function getSegmentDistribution(): Promise<SegmentDistributionRow[]> {
  return safe(async () => {
    const d = await getLatestDate();
    if (!d) return [];
    const rows = await db
      .select()
      .from(segmentDistribution)
      .where(eq(segmentDistribution.snapshotDate, d));
    return rows.map((r) => ({
      segment: r.segment,
      count: r.count,
      shareOfDigital: r.shareOfDigital != null ? Number(r.shareOfDigital) : null,
      shareOfAll: Number(r.shareOfAll),
    }));
  }, []);
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

export async function getOrganisationBreakdown(): Promise<OrganisationBreakdownRow[]> {
  return safe(async () => {
    const d = await getLatestDate();
    if (!d) return [];
    const rows = await db
      .select()
      .from(organisationBreakdown)
      .where(eq(organisationBreakdown.snapshotDate, d))
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

export interface GeographyRow {
  locationOrCountry: string;
  count: number;
  share: number;
  topSegment: string | null;
  topSegments: string[];
  organisationCount: number;
}

export async function getGeography(): Promise<GeographyRow[]> {
  return safe(async () => {
    const d = await getLatestDate();
    if (!d) return [];
    const rows = await db
      .select()
      .from(geography)
      .where(eq(geography.snapshotDate, d))
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
      conditions.push(
        // pg binds windowDays as 'unknown', which makes `date + unknown`
        // ambiguous to Postgres ("operator is not unique"). Cast
        // explicitly to int so the date + int operator is selected.
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
