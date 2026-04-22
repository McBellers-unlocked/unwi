import { DecisionBar, SectionShell } from "@/components/section-shell";
import { getGeography, SEGMENT_LABELS } from "@/lib/data";

export async function Section06Geography() {
  const geo = await getGeography();
  const top15 = geo.slice(0, 15);
  const totalDigital = geo.reduce((acc, g) => acc + g.count, 0);
  const top5Share = top15
    .slice(0, 5)
    .reduce((acc, g) => acc + g.count, 0);
  const concentration = totalDigital > 0 ? (top5Share / totalDigital) * 100 : 0;

  return (
    <SectionShell
      id="section-6"
      number={6}
      title="Geographic Concentration"
      subtitle="Top 15 duty stations by digital hiring in Q1 2026."
      takeaway={
        <>
          <p>
            Top 5 duty stations account for{" "}
            <strong>{concentration.toFixed(0)}%</strong> of digital roles —
            HQ-centric hiring concentration remains the structural baseline.
          </p>
          <p>
            Field capitals (Nairobi, Amman, Manila, Bangkok) carry the
            decentralised minority.
          </p>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {top15.map((g, i) => (
          <div
            key={g.locationOrCountry}
            className="flex items-center justify-between panel px-4 py-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs text-muted font-mono w-6 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-sm text-navy truncate font-medium">
                {g.locationOrCountry}
              </span>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className="text-xs text-muted">
                {g.topSegment
                  ? SEGMENT_LABELS[
                      g.topSegment as keyof typeof SEGMENT_LABELS
                    ] ?? g.topSegment
                  : "—"}
              </span>
              <span className="font-serif text-lg text-navy w-12 text-right">
                {g.count}
              </span>
            </div>
          </div>
        ))}
        {top15.length === 0 && (
          <p className="text-sm text-muted col-span-2">
            Geographic breakdown not yet available — the classifier needs
            location fields from the next Lambda run.
          </p>
        )}
      </div>
      <DecisionBar>
        Digital talent pools cluster in a handful of capitals. Remote-friendly
        role design can broaden the pipeline when field offices compete for the
        same specialisms.
      </DecisionBar>
    </SectionShell>
  );
}
