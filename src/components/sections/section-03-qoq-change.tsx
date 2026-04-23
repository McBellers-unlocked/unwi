import { SectionShell } from "@/components/section-shell";
import {
  getComparatorShares,
  getCutManifest,
  SEGMENT_LABELS,
} from "@/lib/data";
import { ComparatorBar } from "./section-03-chart";

export async function Section03QoQChange() {
  const [shares, manifest] = await Promise.all([
    getComparatorShares(),
    getCutManifest(),
  ]);

  const data = shares
    .map((r) => ({
      segment: r.segment,
      label:
        SEGMENT_LABELS[r.segment as keyof typeof SEGMENT_LABELS] ?? r.segment,
      primary: r.primaryShare,
      comparator: r.comparatorShare,
      deltaPp: r.deltaPp,
    }))
    .sort((a, b) => b.deltaPp - a.deltaPp);

  const winners = data.filter((d) => d.deltaPp > 0);
  const losers = data.filter((d) => d.deltaPp < 0);
  const topWin = winners[0];
  const topLose = losers[losers.length - 1];

  const sources = manifest?.apples_to_apples?.common_sources ?? [];
  const commonSources = sources.length;
  const visible = sources.slice(0, 8).join(", ");
  const overflow = sources.length > 8 ? `, …and ${sources.length - 8} more` : "";

  return (
    <SectionShell
      id="section-3"
      number={3}
      title="What Changed This Quarter"
      subtitle="Segment shares compared quarter-on-quarter. Apples-to-apples across common sources."
      takeaway={
        <>
          <p>
            Biggest gainer:{" "}
            <strong>{topWin?.label ?? "—"}</strong> at +
            {topWin?.deltaPp?.toFixed(2) ?? "0"}pp.
          </p>
          <p>
            Biggest decline:{" "}
            <strong>{topLose?.label ?? "—"}</strong> at{" "}
            {topLose?.deltaPp?.toFixed(2) ?? "0"}pp.
          </p>
          <p className="text-xs text-muted">
            Based on {commonSources} sources common to both periods.
          </p>
        </>
      }
    >
      <ComparatorBar data={data} />
      {commonSources > 0 && (
        <p className="mt-2 text-[11px] text-muted leading-snug">
          Common sources ({commonSources}): {visible}
          {overflow}
        </p>
      )}
    </SectionShell>
  );
}
