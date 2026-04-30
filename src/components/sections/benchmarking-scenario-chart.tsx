import type { Scenario } from "@/lib/benchmarking";

type ReferenceLine = { label: string; pct: number; color: string };

const W = 1100;
const H = 460;
const PAD = { top: 50, right: 240, bottom: 60, left: 60 };

const SCENARIO_COLORS: Record<Scenario["id"], string> = {
  A: "#66788A", // muted slate — status quo
  B: "#0A3C5A", // navy
  C: "#990F3D", // claret — recommended
  D: "#00A0B0", // highlight teal
};

/**
 * Geometric interpolation between Year 1 and Year 5 anchors so a 1.9% →
 * 60% scenario produces a believable curve rather than a straight ramp.
 */
function interpolateScenario(s: Scenario): { year: number; pct: number }[] {
  const points: { year: number; pct: number }[] = [
    { year: 0, pct: 1.9 },
    { year: 1, pct: s.year1 },
  ];
  if (s.year1 === s.year5) {
    points.push({ year: 5, pct: s.year5 });
    return points;
  }
  const ratio = Math.pow(s.year5 / s.year1, 1 / 4);
  for (let y = 2; y <= 5; y++) {
    points.push({ year: y, pct: s.year1 * Math.pow(ratio, y - 1) });
  }
  return points;
}

export function ScenarioChart({
  scenarios,
  referenceLines,
}: {
  scenarios: Scenario[];
  referenceLines: ReferenceLine[];
}) {
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const yMax = 80;
  const xScale = (year: number) => PAD.left + (year / 5) * innerW;
  const yScale = (pct: number) =>
    PAD.top + innerH - (Math.min(pct, yMax) / yMax) * innerH;

  const yTicks = [0, 20, 40, 60, 80];
  const xTicks = [0, 1, 2, 3, 4, 5];

  const baselineY = yScale(0);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label="UNICC PD AI-Core convergence trajectory by scenario, with peer reference lines"
    >
      <g
        fontFamily="var(--font-sans)"
        style={{ fontVariantNumeric: "tabular-nums lining-nums" }}
      >
        {/* Y gridlines */}
        {yTicks.map((t) => (
          <line
            key={`yg-${t}`}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={yScale(t)}
            y2={yScale(t)}
            stroke="#E5D9C8"
            strokeWidth={1}
          />
        ))}

        {/* Y tick labels */}
        {yTicks.map((t) => (
          <text
            key={`yt-${t}`}
            x={PAD.left - 12}
            y={yScale(t) + 4}
            fontSize={12}
            fill="#66788A"
            textAnchor="end"
          >
            {t}%
          </text>
        ))}

        {/* X-axis line */}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={baselineY}
          y2={baselineY}
          stroke="#66788A"
          strokeWidth={1}
        />

        {/* X tick labels */}
        {xTicks.map((t) => (
          <text
            key={`xt-${t}`}
            x={xScale(t)}
            y={baselineY + 22}
            fontSize={12}
            fill="#66788A"
            textAnchor="middle"
          >
            {t === 0 ? "Today" : `Y${t}`}
          </text>
        ))}

        {/* Y-axis title */}
        <text
          x={PAD.left}
          y={PAD.top - 22}
          fontSize={12}
          fill="#66788A"
        >
          AI-Core share of UNICC PD library
        </text>

        {/* X-axis title */}
        <text
          x={PAD.left + innerW / 2}
          y={H - 14}
          fontSize={12}
          fill="#66788A"
          textAnchor="middle"
        >
          Years from Q3 2026
        </text>

        {/* Reference lines */}
        {referenceLines.map((ref) => {
          const y = yScale(ref.pct);
          const isPrivateSector = ref.pct >= 70;
          return (
            <g key={ref.label}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y}
                y2={y}
                stroke={ref.color}
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={isPrivateSector ? 0.7 : 0.5}
              />
              <text
                x={W - PAD.right + 8}
                y={y + 4}
                fontSize={12}
                fill={ref.color}
                fontWeight={500}
              >
                {ref.label}
                <tspan
                  fill="#66788A"
                  fontWeight={400}
                  dx={4}
                >
                  {ref.pct.toFixed(0)}%
                </tspan>
              </text>
            </g>
          );
        })}

        {/* Scenario lines */}
        {scenarios.map((s) => {
          const points = interpolateScenario(s);
          const path = points
            .map(
              (p, i) =>
                `${i === 0 ? "M" : "L"}${xScale(p.year).toFixed(1)},${yScale(p.pct).toFixed(1)}`,
            )
            .join(" ");
          const color = SCENARIO_COLORS[s.id];
          const last = points[points.length - 1]!;
          const isRecommended = s.recommended === true;
          return (
            <g key={s.id}>
              <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={isRecommended ? 3.5 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={s.id === "A" ? 0.7 : 1}
              />
              {/* Endpoint label */}
              <g>
                <circle
                  cx={xScale(last.year)}
                  cy={yScale(last.pct)}
                  r={isRecommended ? 5 : 3.5}
                  fill={color}
                />
                <text
                  x={xScale(last.year) + 10}
                  y={yScale(last.pct) - 8}
                  fontSize={13}
                  fontWeight={isRecommended ? 600 : 500}
                  fill={color}
                >
                  Scenario {s.id}
                </text>
                <text
                  x={xScale(last.year) + 10}
                  y={yScale(last.pct) + 8}
                  fontSize={12}
                  fill="#66788A"
                >
                  {last.pct.toFixed(0)}%
                </text>
              </g>
            </g>
          );
        })}

        {/* Today marker */}
        <g>
          <line
            x1={xScale(0)}
            x2={xScale(0)}
            y1={yScale(1.9) - 4}
            y2={yScale(1.9) + 4}
            stroke="#0A3C5A"
            strokeWidth={2}
          />
          <text
            x={xScale(0) + 6}
            y={yScale(1.9) - 8}
            fontSize={12}
            fontWeight={500}
            fill="#0A3C5A"
          >
            UNICC today · 1.9%
          </text>
        </g>
      </g>
    </svg>
  );
}
