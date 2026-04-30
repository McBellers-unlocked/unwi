import type { PeerRow } from "@/lib/benchmarking";

const BAR_AREA_PCT = 70;

function colorForKind(kind: PeerRow["kind"]): string {
  switch (kind) {
    case "unicc":
      return "#990F3D"; // claret — call out the gap
    case "benchmark":
      return "#00A0B0"; // highlight teal — the bar being measured against
    case "un-system":
    default:
      return "#0A3C5A"; // navy
  }
}

export function PeerLadder({ rows }: { rows: PeerRow[] }) {
  const sorted = [...rows].sort((a, b) => a.pct - b.pct);
  const max = Math.max(...sorted.map((r) => r.pct));
  const domain = Math.ceil(max / 10) * 10;

  return (
    <div>
      <ul className="flex flex-col gap-[14px]">
        {sorted.map((r) => {
          const pct = (r.pct / domain) * BAR_AREA_PCT;
          const color = colorForKind(r.kind);
          const minBarPct = r.pct > 0 ? 0.4 : 0;
          return (
            <li key={r.label}>
              <div className="grid grid-cols-[210px_1fr] items-center gap-4">
                <span className="text-right text-[13px] font-medium text-ink-primary leading-tight">
                  {r.label}
                  {r.n !== null && (
                    <span className="text-ink-muted font-normal">
                      {" · "}n={r.n}
                    </span>
                  )}
                </span>
                <div className="relative h-[26px]">
                  <div
                    className="absolute inset-y-0 left-0"
                    style={{
                      width: `${Math.max(pct, minBarPct)}%`,
                      backgroundColor: color,
                    }}
                  />
                  <span
                    className="numeric absolute top-1/2 -translate-y-1/2 text-[14px]"
                    style={{
                      left: `calc(${Math.max(pct, minBarPct)}% + 8px)`,
                      color,
                      fontWeight: 600,
                    }}
                  >
                    {r.pct.toFixed(1)}%
                  </span>
                </div>
              </div>
              {r.note && (
                <p className="ml-[226px] mt-1 text-[12px] text-ink-muted leading-snug">
                  {r.note}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-6 grid grid-cols-[210px_1fr] gap-4">
        <span />
        <div className="relative h-[14px]">
          {[0, 25, 50, 75, 100].map((tick) => {
            if (tick > domain) return null;
            const pct = (tick / domain) * BAR_AREA_PCT;
            return (
              <div
                key={tick}
                className="absolute top-0 text-[11px] text-ink-muted"
                style={{ left: `${pct}%` }}
              >
                <div className="absolute -top-1 w-px h-2 bg-rule" />
                <span className="absolute top-2 -translate-x-1/2 numeric">
                  {tick}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
