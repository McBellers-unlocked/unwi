import { DeltaBadge } from "@/components/delta-badge";
import { getKpiComparison, SEGMENT_LABELS } from "@/lib/data";

function fmt(n: number): string {
  return n.toLocaleString("en-GB");
}

export async function Section00Kpi() {
  const kpi = await getKpiComparison();
  if (!kpi) return null;

  const { digitalRoles, organisationsHiring, topMover } = kpi;
  const moverLabel = topMover
    ? SEGMENT_LABELS[topMover.segment as keyof typeof SEGMENT_LABELS] ??
      topMover.segment
    : null;

  return (
    <section className="mt-12">
      <div className="mx-auto max-w-column px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 border-t border-rule pt-8">
          <Stat
            term="Digital roles in Q1 2026"
            value={fmt(digitalRoles.q1)}
            footnote={
              digitalRoles.q4 != null && digitalRoles.deltaPct != null ? (
                <span className="inline-flex items-baseline gap-2">
                  <DeltaBadge value={digitalRoles.deltaPct} suffix="%" />
                  <span>vs Q4 2025 ({fmt(digitalRoles.q4)})</span>
                </span>
              ) : (
                <span>Q4 baseline unavailable</span>
              )
            }
          />
          <Stat
            term="Organisations hiring digital"
            value={fmt(organisationsHiring)}
            footnote={<span>across the UN Common System</span>}
          />
          <Stat
            term="Top segment mover Q4 → Q1"
            value={moverLabel ?? "—"}
            footnote={
              topMover ? (
                <DeltaBadge value={topMover.deltaPp} suffix="pp" />
              ) : (
                <span>no significant share movement</span>
              )
            }
          />
        </div>
      </div>
    </section>
  );
}

function Stat({
  term,
  value,
  footnote,
}: {
  term: string;
  value: string;
  footnote: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">
        {term}
      </p>
      <p className="mt-2 numeric font-serif text-[44px] leading-[1] text-ink-primary tracking-tight">
        {value}
      </p>
      <div className="mt-3 text-[12px] text-ink-muted leading-snug">
        {footnote}
      </div>
    </div>
  );
}
