import { getComparatorShares, SEGMENT_LABELS } from "@/lib/data";
import { QoQDiverge } from "./section-03-diverge";

const ANNOTATIONS: Record<string, string> = {
  ITOPS: "IT Ops gains 6.4 points of share, driven by 64 new roles",
  DATA_AI:
    "Data & Analytics falls 7.0 points despite small absolute growth",
};

export async function Section03Shift() {
  const shares = await getComparatorShares();

  const rows = shares
    .map((r) => ({
      segment: r.segment,
      label:
        SEGMENT_LABELS[r.segment as keyof typeof SEGMENT_LABELS] ?? r.segment,
      deltaPp: r.deltaPp,
      annotation: ANNOTATIONS[r.segment],
    }))
    .sort((a, b) => b.deltaPp - a.deltaPp);

  return (
    <section className="mt-24">
      <div className="mx-auto max-w-column px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          03
        </p>
        <h2 className="mt-4 font-serif text-section text-ink-primary tracking-tight">
          IT Operations is surging. Data and Analytics is falling.
        </h2>
        <p className="mt-4 font-serif italic text-standfirst text-ink-muted">
          Quarter-on-quarter share change by segment, restricted to the
          nineteen sources present in both periods.
        </p>

        <div className="mt-8">
          <QoQDiverge rows={rows} />
        </div>

        <p className="mt-6 text-caption text-ink-muted">
          Shares calculated across 19 sources present in both Q4 2025 and Q1
          2026. UNICC data excluded from this comparison to preserve
          apples-to-apples integrity (see methodology for full source list).
        </p>
      </div>
    </section>
  );
}
