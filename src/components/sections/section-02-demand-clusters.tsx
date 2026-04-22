import { SectionShell } from "@/components/section-shell";
import {
  getOrganisationBreakdown,
  getSegmentDistribution,
  SEGMENT_LABELS,
} from "@/lib/data";
import { SegmentRolesBar } from "./section-02-chart";

export async function Section02DemandClusters() {
  const [dist, orgs] = await Promise.all([
    getSegmentDistribution(),
    getOrganisationBreakdown(),
  ]);

  const orgsBySeg = new Map<string, Set<string>>();
  for (const o of orgs) {
    for (const s of [o.topSegment1, o.topSegment2, o.topSegment3]) {
      if (!s) continue;
      if (!orgsBySeg.has(s)) orgsBySeg.set(s, new Set());
      orgsBySeg.get(s)!.add(o.organisation);
    }
  }

  const data = dist
    .filter((r) => r.segment !== "NOT_DIGITAL")
    .map((r) => ({
      segment: r.segment,
      label:
        SEGMENT_LABELS[r.segment as keyof typeof SEGMENT_LABELS] ?? r.segment,
      roles: r.count,
      orgs: orgsBySeg.get(r.segment)?.size ?? 0,
    }))
    .sort((a, b) => b.roles - a.roles);

  const top = data[0];
  const second = data[1];
  const breadth = data.filter((d) => d.roles > 0).length;

  return (
    <SectionShell
      id="section-2"
      number={2}
      title="Where Demand Clusters"
      subtitle="Role volume by segment, with distinct organisations hiring in each."
      takeaway={
        <>
          <p>
            <strong>
              {top?.label ?? "—"}
            </strong>{" "}
            is the largest segment by volume: {top?.roles ?? 0} roles across{" "}
            {top?.orgs ?? 0} organisations.
          </p>
          <p>
            {second?.label ?? "—"} follows at {second?.roles ?? 0} roles.
            Systemic breadth: {breadth} of 9 segments are actively hiring this
            quarter.
          </p>
        </>
      }
    >
      <SegmentRolesBar data={data} />
    </SectionShell>
  );
}
