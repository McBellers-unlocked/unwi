import type { FunctionRow } from "@/lib/benchmarking";

const BAR_AREA_PCT = 80;

export function FunctionBars({ rows }: { rows: FunctionRow[] }) {
  const sorted = [...rows].sort((a, b) => b.total - a.total);
  const max = Math.max(...sorted.map((r) => r.total));

  return (
    <ul className="flex flex-col gap-[12px]">
      {sorted.map((r) => {
        const totalPct = (r.total / max) * BAR_AREA_PCT;
        const aiSlicePct = r.total > 0 ? (r.aiCore / r.total) * totalPct : 0;
        const isZero = r.aiCore === 0;
        const restColor = isZero ? "#990F3D" : "#0A3C5A";
        return (
          <li key={r.fn}>
            <div className="grid grid-cols-[180px_1fr] items-center gap-4">
              <span className="text-right text-[13px] font-medium text-ink-primary leading-tight">
                {r.fn}
              </span>
              <div className="relative h-[28px]">
                {/* Total-PD bar — claret if zero AI-Core, navy if not. */}
                <div
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${totalPct}%`,
                    backgroundColor: restColor,
                    opacity: isZero ? 0.85 : 0.6,
                  }}
                />
                {/* AI-Core slice — teal, on top */}
                {aiSlicePct > 0 && (
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{
                      width: `${aiSlicePct}%`,
                      backgroundColor: "#00A0B0",
                    }}
                  />
                )}
                {/* Counts at the right edge of the bar */}
                <span
                  className="numeric absolute top-1/2 -translate-y-1/2 text-[13px] font-semibold text-ink-primary"
                  style={{ left: `calc(${totalPct}% + 8px)` }}
                >
                  {r.total}
                  <span className="text-ink-muted font-normal">
                    {" "}
                    {r.aiCore === 0
                      ? "· 0 AI-Core"
                      : `· ${r.aiCore} AI-Core (${r.pct.toFixed(1)}%)`}
                  </span>
                </span>
              </div>
            </div>
            {r.note && (
              <p
                className={
                  "ml-[196px] mt-1 text-[12px] leading-snug " +
                  (isZero ? "text-claret font-medium" : "text-ink-muted")
                }
              >
                {r.note}
              </p>
            )}
          </li>
        );
      })}

      <li className="mt-3 grid grid-cols-[180px_1fr] items-center gap-4">
        <span />
        <div className="flex items-center gap-5 text-[12px] text-ink-muted">
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block w-3 h-3"
              style={{ backgroundColor: "#00A0B0" }}
            />
            AI-Core
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block w-3 h-3"
              style={{ backgroundColor: "#0A3C5A", opacity: 0.6 }}
            />
            Other PDs
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block w-3 h-3"
              style={{ backgroundColor: "#990F3D", opacity: 0.85 }}
            />
            Function with zero AI-Core
          </span>
        </div>
      </li>
    </ul>
  );
}
