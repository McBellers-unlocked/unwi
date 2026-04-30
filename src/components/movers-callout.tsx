import { DeltaBadge } from "@/components/delta-badge";
import {
  getOrgMovers,
  SEGMENT_LABELS,
  type OrgMoverRow,
  type SegmentCode,
} from "@/lib/data";

export async function MoversCallout() {
  const movers = await getOrgMovers(3);
  if (!movers) return null;
  if (movers.risers.length === 0 && movers.fallers.length === 0) return null;

  return (
    <section className="mt-24">
      <div className="mx-auto max-w-column px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          Movers
        </p>
        <h2 className="mt-4 font-serif text-section text-ink-primary tracking-tight">
          Who's adding roles. Who's pulling back.
        </h2>
        <p className="mt-4 font-serif italic text-standfirst text-ink-muted">
          Largest organisation-level changes in digital postings between
          Q4 2025 (Oct &ndash; Dec) and Q1 2026 (Jan &ndash; Mar), across the
          apples-to-apples source set used in section 03.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-10">
          <Column title="Top 3 risers" tone="up" rows={movers.risers} />
          <Column title="Top 3 fallers" tone="down" rows={movers.fallers} />
        </div>
      </div>
    </section>
  );
}

function Column({
  title,
  tone,
  rows,
}: {
  title: string;
  tone: "up" | "down";
  rows: OrgMoverRow[];
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">
        {title}
      </p>
      {rows.length === 0 ? (
        <p className="mt-4 text-[13px] text-ink-muted italic">
          No {tone === "up" ? "risers" : "fallers"} in this comparison.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col">
          {rows.map((m) => (
            <li
              key={m.organisation}
              className="grid grid-cols-[1fr_auto] gap-4 items-baseline py-3 border-t border-rule"
            >
              <div>
                <p className="text-[14px] font-medium text-ink-primary leading-tight">
                  {m.organisation}
                </p>
                {m.topSegment && (
                  <p className="mt-1 text-[12px] text-ink-muted">
                    Top segment:{" "}
                    {SEGMENT_LABELS[m.topSegment as SegmentCode] ??
                      m.topSegment}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="numeric text-[15px] font-semibold text-ink-primary">
                  {m.q1Count}
                </p>
                <p className="numeric text-[11px] text-ink-muted">
                  Q4: {m.q4Count}
                </p>
                <div className="mt-1">
                  <DeltaBadge value={m.delta} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
