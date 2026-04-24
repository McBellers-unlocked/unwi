import { getSegmentDistribution, SEGMENT_LABELS } from "@/lib/data";

const HIGHLIGHT_SEGMENTS = new Set(["ITOPS", "DATA_AI"]);

export async function Section01Shape() {
  const dist = await getSegmentDistribution();

  const rows = dist
    .filter((r) => r.segment !== "NOT_DIGITAL")
    .map((r) => ({
      segment: r.segment,
      label:
        SEGMENT_LABELS[r.segment as keyof typeof SEGMENT_LABELS] ?? r.segment,
      count: r.count,
    }))
    .sort((a, b) => b.count - a.count);

  const max = Math.max(1, ...rows.map((r) => r.count));
  const total = rows.reduce((s, r) => s + r.count, 0);
  const topTwoShare =
    total > 0
      ? rows
          .filter((r) => HIGHLIGHT_SEGMENTS.has(r.segment))
          .reduce((s, r) => s + r.count, 0) / total
      : 0;
  const topTwoPct = Math.round(topTwoShare * 100);

  return (
    <section className="mt-16">
      <div className="mx-auto max-w-column px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          01
        </p>
        <h2 className="mt-4 font-serif text-section text-ink-primary tracking-tight">
          Nine segments. Two dominate.
        </h2>
        <p className="mt-4 font-serif italic text-standfirst text-ink-muted">
          Every UN Common System agency is hiring digital talent in 2026, but
          the work concentrates heavily in two segments.
        </p>

        <div className="mt-8">
          <BarList rows={rows} max={max} />
        </div>

        <p className="mt-4 text-caption text-ink-muted">
          IT Operations &amp; Support and Data, Analytics &amp; AI account for
          {" "}
          {topTwoPct}% of digital hiring across the UN Common System in Q1
          2026. Source: UN Workforce Intelligence, n={total} digital roles.
        </p>
      </div>
    </section>
  );
}

function BarList({
  rows,
  max,
}: {
  rows: { segment: string; label: string; count: number }[];
  max: number;
}) {
  // Reserve space at the end of the track for the numeric label so the longest
  // bar's label never collides with the right edge.
  const BAR_AREA_PCT = 88;
  return (
    <ul className="flex flex-col gap-[14px]">
      {rows.map((r) => {
        const pct = (r.count / max) * BAR_AREA_PCT;
        const isHighlight = HIGHLIGHT_SEGMENTS.has(r.segment);
        const barColor = isHighlight ? "#00A0B0" : "#0A3C5A";
        return (
          <li
            key={r.segment}
            className="grid grid-cols-[200px_1fr] items-center gap-4"
          >
            <span className="text-right text-[13px] font-medium text-ink-primary leading-tight">
              {r.label}
            </span>
            <div className="relative h-[26px]">
              <div
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${pct}%`,
                  minWidth: 2,
                  backgroundColor: barColor,
                }}
              />
              <span
                className="numeric absolute top-1/2 -translate-y-1/2 text-[14px] text-ink-primary"
                style={{
                  left: `calc(${pct}% + 8px)`,
                  fontWeight: 600,
                }}
              >
                {r.count}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
