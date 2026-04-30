import { getSinceAugAggregates, SEGMENT_LABELS } from "@/lib/data";

function fmt(n: number): string {
  return n.toLocaleString("en-GB");
}

function fmtMonth(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.valueOf())) return iso;
  return d.toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function SinceAugKpi() {
  const a = await getSinceAugAggregates();
  if (!a) return null;
  const top = [...a.segments].sort((x, y) => y.count - x.count)[0];
  const topLabel = top
    ? SEGMENT_LABELS[top.segment as keyof typeof SEGMENT_LABELS] ?? top.segment
    : null;

  return (
    <section className="mt-12">
      <div className="mx-auto max-w-column px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          {fmtMonth(a.period.from)} → {fmtMonth(a.period.to)}
        </p>
        <h2 className="mt-2 font-serif text-section text-ink-primary tracking-tight">
          What the UN system has been hiring since August 2025.
        </h2>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-8 border-t border-rule pt-8">
          <Stat
            term="Digital roles posted"
            value={fmt(a.totals.digital_postings)}
            footnote={`of ${fmt(a.totals.total_postings)} total postings (${a.totals.digital_share_pct.toFixed(1)}%)`}
          />
          <Stat
            term="Organisations hiring digital"
            value={fmt(a.totals.organisations_represented)}
            footnote="across the UN Common System"
          />
          <Stat
            term="Largest segment"
            value={topLabel ?? "—"}
            footnote={top ? `${fmt(top.count)} roles · ${top.share_of_digital.toFixed(1)}% of digital` : "—"}
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
  footnote: string;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">
        {term}
      </p>
      <p className="mt-2 numeric font-serif text-[44px] leading-[1] text-ink-primary tracking-tight">
        {value}
      </p>
      <p className="mt-3 text-[12px] text-ink-muted leading-snug">
        {footnote}
      </p>
    </div>
  );
}
