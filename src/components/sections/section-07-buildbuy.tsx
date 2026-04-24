import { getStaffVsConsultant, SEGMENT_LABELS } from "@/lib/data";

const ANNOTATIONS: Record<string, string> = {
  CYBER: "71% consultant — the UN is not building its own cyber capacity",
  ENTERPRISE: "0% — entirely staff-built",
};

export async function Section07BuildBuy() {
  const svc = await getStaffVsConsultant();
  const segments = svc?.segments ?? [];

  const rows = segments
    .map((s) => ({
      segment: s.segment,
      label:
        SEGMENT_LABELS[s.segment as keyof typeof SEGMENT_LABELS] ?? s.segment,
      consultantPct: s.consultant_share_pct,
      annotation: ANNOTATIONS[s.segment],
    }))
    .sort((a, b) => b.consultantPct - a.consultantPct);

  return (
    <section className="mt-24">
      <div className="mx-auto max-w-column px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          07
        </p>
        <h2 className="mt-4 font-serif text-section text-ink-primary tracking-tight">
          The UN system builds its IT operations. It rents its cybersecurity.
        </h2>
        <p className="mt-4 font-serif italic text-standfirst text-ink-muted">
          Consultant share of total hiring, per digital segment. High
          consultant share suggests capability being rented rather than built.
        </p>

        <div className="mt-8">
          <ConsultantBars rows={rows} />
        </div>

        <p className="mt-6 text-caption text-ink-muted">
          Cybersecurity and Digital Policy &amp; Advisory are the UN system&rsquo;s
          most consultant-dependent segments. The strategic question: is this
          contingent reliance reflecting market scarcity, budget constraints,
          or a workforce-planning choice?
        </p>
      </div>
    </section>
  );
}

interface Row {
  segment: string;
  label: string;
  consultantPct: number;
  annotation?: string;
}

function ConsultantBars({ rows }: { rows: Row[] }) {
  // Track width reserved for the bar area; the rest of the row carries the
  // numeric label and any inline annotation without competing with the bar.
  const BAR_AREA_PCT = 62;
  return (
    <ul className="flex flex-col gap-[10px]">
      {rows.map((r) => {
        const pct = (r.consultantPct / 100) * BAR_AREA_PCT;
        return (
          <li key={r.segment}>
            <div className="grid grid-cols-[200px_1fr] items-center gap-4">
              <span className="text-right text-[13px] font-medium text-ink-primary leading-tight">
                {r.label}
              </span>
              <div className="relative h-[26px]">
                <div
                  className="absolute inset-y-0 left-0 h-[22px] top-1/2 -translate-y-1/2"
                  style={{
                    width: `${pct}%`,
                    minWidth: r.consultantPct > 0 ? 2 : 0,
                    backgroundColor: "#990F3D",
                  }}
                />
                <span
                  className="numeric absolute top-1/2 -translate-y-1/2 text-[14px] font-semibold text-claret"
                  style={{
                    left: `calc(${pct}% + 8px)`,
                    fontFamily: "var(--font-serif)",
                  }}
                >
                  {Math.round(r.consultantPct)}%
                </span>
              </div>
            </div>
            {r.annotation && (
              <p className="ml-[216px] mt-1 text-[13px] font-medium text-ink-primary">
                {r.annotation}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
