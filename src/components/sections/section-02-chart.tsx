"use client";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Row {
  segment: string;
  label: string;
  roles: number;
  orgs: number;
}

// Radius in SVG px, scaled from the roles/orgs ratio.
// Realistic ratios in this dataset land roughly in [1, 20]; sqrt-based
// interpolation keeps the middle of the range readable without the
// biggest ratio swallowing everything else.
function radiusFromRatio(ratio: number): number {
  const MIN_R = 12;
  const MAX_R = 36;
  const LOW = 0.5;
  const HIGH = 20;
  const capped = Math.min(HIGH, Math.max(LOW, ratio));
  const t =
    (Math.sqrt(capped) - Math.sqrt(LOW)) /
    (Math.sqrt(HIGH) - Math.sqrt(LOW));
  return MIN_R + t * (MAX_R - MIN_R);
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: Row;
}

function SegmentDot({ cx, cy, payload }: DotProps) {
  if (cx == null || cy == null || !payload) return null;
  const ratio = payload.orgs > 0 ? payload.roles / payload.orgs : 0;
  const r = radiusFromRatio(ratio);
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="#0F2540"
        stroke="#4DAFA8"
        strokeWidth={2}
      />
      <text
        x={cx}
        y={cy - r - 6}
        textAnchor="middle"
        style={{
          fontFamily: "var(--font-serif), Georgia, serif",
          fontSize: 12,
          fill: "#0F2540",
          pointerEvents: "none",
        }}
      >
        {payload.label}
      </text>
    </g>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: { payload: Row }[];
}

function SegmentTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const first = payload[0];
  if (!first) return null;
  const d = first.payload;
  const ratio = d.orgs > 0 ? d.roles / d.orgs : 0;
  return (
    <div className="bg-white border border-panel-line rounded-md shadow-sm p-3 text-xs">
      <p className="font-semibold text-navy">{d.label}</p>
      <p className="text-navy mt-1">
        {d.roles} roles across {d.orgs} organisations
      </p>
      <p className="text-muted mt-1">
        {ratio.toFixed(1)} roles per organisation
      </p>
    </div>
  );
}

export function SegmentScatter({ data }: { data: Row[] }) {
  const maxRoles = Math.max(0, ...data.map((d) => d.roles));
  const maxOrgs = Math.max(0, ...data.map((d) => d.orgs));
  // Pad the axes ~15% so labels don't clip the frame at the extremes.
  const xMax = Math.max(10, Math.ceil((maxRoles * 1.15) / 10) * 10);
  const yMax = Math.max(5, Math.ceil((maxOrgs * 1.15) / 5) * 5);
  const quadLabel =
    "text-[11px] tracking-wider uppercase text-slate/30 font-sans whitespace-nowrap";
  return (
    <div className="relative w-full h-[440px]">
      <div className="absolute inset-0 pointer-events-none select-none">
        <span
          className={`absolute top-[25%] left-[25%] -translate-x-1/2 -translate-y-1/2 ${quadLabel}`}
        >
          Wide participation, low volume
        </span>
        <span
          className={`absolute top-[25%] left-[75%] -translate-x-1/2 -translate-y-1/2 ${quadLabel}`}
        >
          Systemic &amp; broad
        </span>
        <span
          className={`absolute top-[75%] left-[25%] -translate-x-1/2 -translate-y-1/2 ${quadLabel}`}
        >
          Niche
        </span>
        <span
          className={`absolute top-[75%] left-[75%] -translate-x-1/2 -translate-y-1/2 ${quadLabel}`}
        >
          High volume, concentrated
        </span>
      </div>
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 32, right: 32, bottom: 44, left: 56 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#e5e7eb" />
          <XAxis
            type="number"
            dataKey="roles"
            domain={[0, xMax]}
            stroke="#5A6C7D"
            fontSize={11}
            label={{
              value: "Role volume",
              position: "insideBottom",
              offset: -24,
              fill: "#5A6C7D",
              fontSize: 12,
            }}
          />
          <YAxis
            type="number"
            dataKey="orgs"
            domain={[0, yMax]}
            stroke="#5A6C7D"
            fontSize={11}
            label={{
              value: "Organisations participating",
              angle: -90,
              position: "insideLeft",
              offset: 8,
              fill: "#5A6C7D",
              fontSize: 12,
              style: { textAnchor: "middle" },
            }}
          />
          <Tooltip content={<SegmentTooltip />} cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={data} shape={<SegmentDot />} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
