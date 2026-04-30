import { getScopeBreakdown } from "@/lib/data";

function fmt(n: number): string {
  return n.toLocaleString("en-GB");
}

const UN_SCOPE = "UN Common System";

export async function CoverageTile() {
  const breakdown = await getScopeBreakdown();
  if (!breakdown) return null;

  const un = breakdown.groups.find((g) => g.group === UN_SCOPE);
  const partners = breakdown.groups.filter((g) => g.group !== UN_SCOPE);
  if (!un) return null;

  return (
    <section className="mt-12">
      <div className="mx-auto max-w-column px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          Coverage
        </p>
        <h2 className="mt-2 font-serif text-section text-ink-primary tracking-tight">
          Who this dashboard is watching.
        </h2>
        <p className="mt-4 font-serif italic text-standfirst text-ink-muted">
          The UN-system sections drive the rest of this page. Partner-group
          totals here are early coverage data &mdash; the same classifier
          and taxonomy applied to postings from organisations outside the
          UN Common System.
        </p>

        <div className="mt-8 border-t border-rule pt-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">
            Primary scope
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="numeric font-serif text-[36px] leading-none text-ink-primary tracking-tight">
              {fmt(un.digital_postings)}
            </span>
            <span className="text-[13px] text-ink-primary font-medium">
              digital roles in the UN Common System
            </span>
            <span className="text-[12px] text-ink-muted">
              ({fmt(un.total_postings)} total postings &middot;{" "}
              {fmt(un.organisations_represented)} organisations)
            </span>
          </div>
        </div>

        {partners.length > 0 && (
          <div className="mt-8 border-t border-rule pt-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">
              Partner groups now tracked
            </p>
            <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {partners.map((g) => (
                <li
                  key={g.group}
                  className="grid grid-cols-[1fr_auto] items-baseline gap-3"
                >
                  <span className="text-[13px] text-ink-primary">
                    {g.group}
                  </span>
                  <span className="text-right">
                    <span className="numeric text-[14px] font-semibold text-ink-primary">
                      {fmt(g.digital_postings)}
                    </span>
                    <span className="numeric text-[11px] text-ink-muted">
                      {" "}/ {fmt(g.total_postings)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[12px] text-ink-muted leading-snug">
              Each row: digital roles / total postings since the partner
              feed entered coverage. Partner data does not flow into the
              UN-system sections below &mdash; those still filter strictly
              to the UN Common System for apples-to-apples integrity.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
