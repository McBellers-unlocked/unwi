import { SectionShell, StatTile } from "@/components/section-shell";
import {
  getHeadlineNumbers,
  getCollisionProfiles,
  getConcurrencyTimeseries,
  getGeography,
  getSegmentDistribution,
  SEGMENT_LABELS,
} from "@/lib/data";

function fmt(n: number): string {
  return n.toLocaleString("en-GB");
}

export async function Section01Cover() {
  const [headline, collisions, concurrency, geo, dist] = await Promise.all([
    getHeadlineNumbers(),
    getCollisionProfiles(),
    getConcurrencyTimeseries(),
    getGeography(),
    getSegmentDistribution(),
  ]);

  const orgCount = dist.length
    ? Math.max(
        0,
        ...dist.filter((r) => r.segment !== "NOT_DIGITAL").map((r) => r.count),
      )
    : 0;

  const topConcurrency = concurrency?.segments
    .map((s) => ({
      segment: s.segment,
      peak: Math.max(0, ...s.points.map((p) => p.distinct_organisations)),
    }))
    .sort((a, b) => b.peak - a.peak)[0];

  const dataAnalystCollisions = collisions?.profiles.find(
    (p) => p.segment === "DATA_AI" && p.canonical_title.includes("data"),
  );

  const itopsPeak = concurrency?.segments.find((s) => s.segment === "ITOPS");
  const itopsMax = itopsPeak
    ? Math.max(0, ...itopsPeak.points.map((p) => p.distinct_organisations))
    : 0;

  const geneva = geo.find((g) => g.locationOrCountry.toLowerCase().includes("geneva"));

  // The classifier writes segment_counts as a dict (segment -> count), not the
  // typed `segments[]` array the schema declares. Derive the largest segment
  // directly from the dict until the classifier catches up to the schema.
  const segmentCounts = (headline as unknown as {
    segment_counts?: Record<string, number>;
  })?.segment_counts ?? {};
  const largest = Object.entries(segmentCounts)
    .sort(([, a], [, b]) => b - a)[0];
  const largestSegmentCode = largest?.[0];
  const largestSegmentCount = largest?.[1] ?? 0;
  const largestSegmentLabel = largestSegmentCode
    ? SEGMENT_LABELS[largestSegmentCode as keyof typeof SEGMENT_LABELS] ??
      largestSegmentCode
    : "—";

  return (
    <SectionShell
      id="section-1"
      number={1}
      title="At-a-Glance"
      subtitle="Q1 2026 Digital Issue. Locked 9-segment taxonomy, 0.997 precision on a 2,676-row gold sample."
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile
          label="Total digital roles"
          value={fmt(headline?.digital_postings ?? 0)}
          sub="Primary period, Q1 2026"
        />
        <StatTile
          label="Digital share of hiring"
          value={`${headline?.digital_share_pct?.toFixed(1) ?? "0.0"}%`}
          sub={`of ${fmt(headline?.total_postings ?? 0)} total postings`}
        />
        <StatTile label="Digital segments" value="9" sub="Locked taxonomy" />
        <StatTile
          label="Largest segment"
          value={largestSegmentLabel}
          sub={`${fmt(largestSegmentCount)} roles`}
        />
        <StatTile
          label="Peak concurrent hiring"
          value={topConcurrency?.peak ?? 0}
          sub={`${topConcurrency ? SEGMENT_LABELS[topConcurrency.segment as keyof typeof SEGMENT_LABELS] ?? topConcurrency.segment : "—"}, peak month`}
        />
        <StatTile
          label="Orgs hiring parallel profiles"
          value={dataAnalystCollisions?.organisation_count ?? 0}
          sub="Same normalised title, ≥3 orgs"
        />
        <StatTile
          label="ITOPS in-market peak"
          value={itopsMax}
          sub="Distinct orgs, peak month"
        />
        <StatTile
          label="Geneva digital cluster"
          value={geneva?.count ?? 0}
          sub={geneva?.topSegment ?? "—"}
        />
      </div>
      <div className="mt-8 bg-navy text-white px-6 py-5 rounded-md">
        <p className="text-teal font-semibold uppercase text-xs tracking-wider mb-2">
          The scarcity signal
        </p>
        <p className="text-sm leading-relaxed">
          Where generalist UN roles draw 100–350 applications, ERP, SAP and
          specialist security roles draw 1–10. Supply is structurally below
          demand.
        </p>
      </div>
    </SectionShell>
  );
}
