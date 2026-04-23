import { SectionShell } from "@/components/section-shell";
import {
  getOrganisationBreakdown,
  getSegmentDistribution,
  SEGMENT_LABELS,
} from "@/lib/data";
import { SegmentScatter } from "./section-02-chart";

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
  const policy = data.find((d) => d.segment === "POLICY_ADVISORY");
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
            <strong>{top?.label ?? "—"}</strong> leads on both volume (
            {top?.roles ?? 0} roles) and participation ({top?.orgs ?? 0}{" "}
            organisations) — the segment the entire UN system is hiring in.
          </p>
          <p>
            <strong>{policy?.label ?? "Digital Policy &amp; Advisory"}</strong>{" "}
            shows concentrated hiring ({policy?.roles ?? 0} roles across{" "}
            {policy?.orgs ?? 0} orgs).
          </p>
          <p>
            Systemic breadth: {breadth} of 9 segments are actively hiring this
            quarter.
          </p>
        </>
      }
    >
      <SegmentScatter data={data} />
    </SectionShell>
  );
}
