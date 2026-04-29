import type { AgencyRow } from "@/lib/benchmarking";

const BAR_AREA_PCT = 70;
const HIGHLIGHT_AGENCIES = new Set(["UNDP", "World Bank Group"]);

export function AgencyBars({ rows }: { rows: AgencyRow[] }) {
  const max = Math.max(40, ...rows.map((r) => r.pct));
  const domain = Math.ceil(max / 10) * 10;

  return (
    <ul className="flex flex-col gap-[10px]">
      {rows.map((r) => {
        const pct = (r.pct / domain) * BAR_AREA_PCT;
        const minPct = r.pct > 0 ? 0.4 : 0;
        const isHighlight = HIGHLIGHT_AGENCIES.has(r.agency);
        const isZero = r.pct === 0;
        const color = isHighlight
          ? "#00A0B0"
          : isZero
          ? "#E5D9C8"
          : "#0A3C5A";
        return (
          <li key={r.agency}>
            <div className="grid grid-cols-[200px_1fr] items-center gap-4">
              <span className="text-right text-[13px] font-medium text-ink-primary leading-tight">
                {r.agency}
                <span className="text-ink-muted font-normal">
                  {" · "}n={r.n}
                </span>
              </span>
              <div className="relative h-[22px]">
                {isZero ? (
                  <div
                    className="absolute inset-y-0 left-0 h-px top-1/2 -translate-y-1/2"
                    style={{ width: "8%", backgroundColor: "#66788A" }}
                  />
                ) : (
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{
                      width: `${Math.max(pct, minPct)}%`,
                      backgroundColor: color,
                    }}
                  />
                )}
                <span
                  className="numeric absolute top-1/2 -translate-y-1/2 text-[13px]"
                  style={{
                    left: isZero ? "12%" : `calc(${Math.max(pct, minPct)}% + 8px)`,
                    color: isZero ? "#66788A" : color,
                    fontWeight: 600,
                  }}
                >
                  {r.pct.toFixed(1)}%
                  <span className="font-normal text-ink-muted">
                    {" "}({r.aiCore}/{r.n})
                  </span>
                </span>
              </div>
            </div>
          </li>
        );
      })}
      <li className="mt-3 grid grid-cols-[200px_1fr] gap-4">
        <span />
        <p className="text-[12px] text-ink-muted leading-snug">
          UNDP and World Bank Group highlighted teal — the in-motion peers.
          Sample sizes vary; precise percentages should be read with sample-size
          caveats.
        </p>
      </li>
    </ul>
  );
}
