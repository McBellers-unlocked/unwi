interface Row {
  segment: string;
  label: string;
  deltaPp: number;
  annotation?: string;
}

function formatDelta(v: number): string {
  const sign = v >= 0 ? "+" : "−";
  return `${sign}${Math.abs(v).toFixed(2)}pp`;
}

export function QoQDiverge({ rows }: { rows: Row[] }) {
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.deltaPp)));
  // Give the largest bar a hair of breathing room so the label never kisses
  // the right edge of the track.
  const domain = Math.max(1, Math.ceil(maxAbs * 1.1));

  return (
    <ul className="flex flex-col gap-[10px]">
      {rows.map((r) => (
        <li key={r.segment}>
          <div className="grid grid-cols-[200px_1fr] items-center gap-4">
            <span className="text-right text-[13px] font-medium text-ink-primary leading-tight">
              {r.label}
            </span>
            <DivergingBar delta={r.deltaPp} domain={domain} />
          </div>
          {r.annotation && (
            <p className="ml-[216px] mt-[2px] text-[12px] italic text-ink-muted">
              {r.annotation}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function DivergingBar({
  delta,
  domain,
}: {
  delta: number;
  domain: number;
}) {
  const pctHalf = 46; // each half of the track (pct of track)
  const pct = (Math.abs(delta) / domain) * pctHalf;
  const isPos = delta >= 0;
  const color = isPos ? "#00A0B0" : "#990F3D";

  return (
    <div className="relative h-[26px]">
      <div
        className="absolute inset-y-0 w-px bg-rule"
        style={{ left: "50%" }}
      />
      <div
        className="absolute top-1/2 h-[22px]"
        style={{
          transform: "translateY(-50%)",
          left: isPos ? "50%" : `calc(50% - ${pct}%)`,
          width: `${pct}%`,
          backgroundColor: color,
        }}
      />
      <span
        className="numeric absolute top-1/2 text-[13px]"
        style={{
          left: isPos
            ? `calc(50% + ${pct}% + 6px)`
            : `calc(50% - ${pct}% - 6px)`,
          transform: isPos
            ? "translateY(-50%)"
            : "translate(-100%, -50%)",
          color,
          fontWeight: 600,
        }}
      >
        {formatDelta(delta)}
      </span>
    </div>
  );
}
