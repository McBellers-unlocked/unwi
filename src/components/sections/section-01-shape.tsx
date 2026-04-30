import { DeltaBadge } from "@/components/delta-badge";
import {
  getSegmentDistribution,
  SEGMENT_LABELS,
  type ComparatorShareRow,
  type SegmentDistributionTrend,
} from "@/lib/data";

const HIGHLIGHT_SEGMENTS = new Set(["ITOPS", "DATA_AI"]);

export async function Section01Shape({
  trend,
  comparator,
}: {
  trend?: SegmentDistributionTrend | null;
  comparator?: ComparatorShareRow[] | null;
}) {
  const dist = trend?.end ?? (await getSegmentDistribution());

  const q4ByCode = new Map<string, number>();
  if (comparator) {
    for (const c of comparator) q4ByCode.set(c.segment, c.comparatorCount);
  }

  const rows = dist
    .filter((r) => r.segment !== "NOT_DIGITAL")
    .map((r) => ({
      segment: r.segment,
      label:
        SEGMENT_LABELS[r.segment as keyof typeof SEGMENT_LABELS] ?? r.segment,
      count: r.count,
      q4Count: q4ByCode.get(r.segment) ?? null,
      delta: trend?.deltas[r.segment]?.delta ?? 0,
    }))
    .sort((a, b) => b.count - a.count);

  const max = Math.max(
    1,
    ...rows.map((r) => Math.max(r.count, r.q4Count ?? 0)),
  );
  const total = rows.reduce((s, r) => s + r.count, 0);
  const topTwoShare =
    total > 0
      ? rows
          .filter((r) => HIGHLIGHT_SEGMENTS.has(r.segment))
          .reduce((s, r) => s + r.count, 0) / total
      : 0;
  const topTwoPct = Math.round(topTwoShare * 100);

  const showComparator = (comparator?.length ?? 0) > 0;

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
          <BarList rows={rows} max={max} showComparator={showComparator} />
        </div>

        {showComparator && (
          <div className="mt-3 flex items-center gap-4 text-[11px] text-ink-muted">
            <LegendSwatch type="solid" /> Q1 2026
            <LegendSwatch type="outline" /> Q4 2025
          </div>
        )}

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

interface BarRow {
  segment: string;
  label: string;
  count: number;
  q4Count: number | null;
  delta: number;
}

function BarList({
  rows,
  max,
  showComparator,
}: {
  rows: BarRow[];
  max: number;
  showComparator: boolean;
}) {
  const BAR_AREA_PCT = 80;
  return (
    <ul className="flex flex-col gap-[14px]">
      {rows.map((r) => {
        const pct = (r.count / max) * BAR_AREA_PCT;
        const q4Pct = r.q4Count != null ? (r.q4Count / max) * BAR_AREA_PCT : 0;
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
              {showComparator && r.q4Count != null && (
                <div
                  className="absolute inset-y-0 left-0 pointer-events-none"
                  style={{
                    width: `${q4Pct}%`,
                    minWidth: 2,
                    border: `1px dashed ${barColor}`,
                    backgroundColor: "transparent",
                  }}
                  aria-hidden
                />
              )}
              <span
                className="numeric absolute top-1/2 -translate-y-1/2 inline-flex items-baseline gap-2 text-[14px] text-ink-primary"
                style={{
                  left: `calc(${Math.max(pct, q4Pct)}% + 8px)`,
                  fontWeight: 600,
                }}
              >
                {r.count}
                <DeltaBadge value={r.delta} />
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function LegendSwatch({ type }: { type: "solid" | "outline" }) {
  if (type === "solid") {
    return (
      <span
        aria-hidden
        className="inline-block h-[10px] w-[18px] align-middle"
        style={{ backgroundColor: "#0A3C5A" }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="inline-block h-[10px] w-[18px] align-middle"
      style={{ border: "1px dashed #0A3C5A", backgroundColor: "transparent" }}
    />
  );
}
