import {
  getOrganisationBreakdown,
  getSegmentDistribution,
  SEGMENT_LABELS,
  type ComparatorShareRow,
  type OrganisationBreakdownTrend,
  type SegmentDistributionTrend,
} from "@/lib/data";
import { SegmentScatter } from "./section-02-scatter";

export async function Section02Demand({
  segTrend,
  orgTrend,
  comparator,
}: {
  segTrend?: SegmentDistributionTrend | null;
  orgTrend?: OrganisationBreakdownTrend | null;
  comparator?: ComparatorShareRow[] | null;
}) {
  const dist = segTrend?.end ?? (await getSegmentDistribution());
  const orgs = orgTrend?.end ?? (await getOrganisationBreakdown());

  const orgsBySeg = new Map<string, Set<string>>();
  for (const o of orgs) {
    for (const s of [o.topSegment1, o.topSegment2, o.topSegment3]) {
      if (!s) continue;
      if (!orgsBySeg.has(s)) orgsBySeg.set(s, new Set());
      orgsBySeg.get(s)!.add(o.organisation);
    }
  }

  const q4ByCode = new Map<string, number>();
  if (comparator) {
    for (const c of comparator) q4ByCode.set(c.segment, c.comparatorCount);
  }

  const points = dist
    .filter((r) => r.segment !== "NOT_DIGITAL")
    .map((r) => ({
      segment: r.segment,
      label:
        SEGMENT_LABELS[r.segment as keyof typeof SEGMENT_LABELS] ?? r.segment,
      roles: r.count,
      orgs: orgsBySeg.get(r.segment)?.size ?? 0,
      q4Roles: q4ByCode.get(r.segment) ?? null,
      delta: segTrend?.deltas[r.segment]?.delta,
    }));

  const showSlope = (comparator?.length ?? 0) > 0;

  return (
    <section className="mt-24">
      <div className="mx-auto max-w-column px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          02
        </p>
        <h2 className="mt-4 font-serif text-section text-ink-primary tracking-tight">
          A few segments do the bulk of the hiring. The rest are niche.
        </h2>
        <p className="mt-4 font-serif italic text-standfirst text-ink-muted">
          Role volume plotted against organisational participation. Segments
          in the top-right are the ones every agency is chasing.
        </p>

        <div className="mt-8">
          <SegmentScatter data={points} />
        </div>

        <p className="mt-4 text-caption text-ink-muted">
          Each dot is one of nine digital segments. Segments toward the
          top-right are where the UN system competes with itself most.
          {showSlope ? (
            <>
              {" "}Horizontal arrows behind each bubble show Q4 2025 → Q1 2026
              role-volume movement (teal = grew, claret = shrank). Y-axis is
              held at Q1 organisation count because Q4 org-level breakdown is
              not stored.
            </>
          ) : (
            <>
              {" "}Δ shown on each label is the net change in role count over
              the active window.
            </>
          )}
        </p>
      </div>
    </section>
  );
}
