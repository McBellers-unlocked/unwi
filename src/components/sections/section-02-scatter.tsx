"use client";

interface Datum {
  segment: string;
  label: string;
  roles: number;
  orgs: number;
  /** Q4 2025 role count for this segment (Q1 vs Q4 slope arrow). Optional. */
  q4Roles?: number | null;
  /** Δ in role count over the active window. Optional. */
  delta?: number;
}

const HIGHLIGHT = new Set(["ITOPS", "DATA_AI"]);

// Log-spaced ticks with literal tick values (FT convention — log layout, linear labels).
const X_TICKS = [1, 3, 10, 30, 100];
const Y_TICKS = [1, 3, 10, 30];
const X_MIN = 1;
const X_MAX = 150;
const Y_MIN = 1;
const Y_MAX = 30;

function log10(v: number): number {
  return Math.log10(Math.max(v, 1e-6));
}

// Returns the point on the bubble's edge where a leader line should terminate so
// the line visibly ends at the bubble without overlapping its fill.
function lineEndAt(
  from: { x: number; y: number },
  bubble: { cx: number; cy: number; r: number },
): { x: number; y: number } {
  const dx = from.x - bubble.cx;
  const dy = from.y - bubble.cy;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const k = (bubble.r + 2) / dist;
  return { x: bubble.cx + dx * k, y: bubble.cy + dy * k };
}

function fmtDelta(d: number): string {
  if (Math.round(d) === 0) return "";
  return `${d > 0 ? "+" : "−"}${Math.abs(Math.round(d))}`;
}

export function SegmentScatter({ data }: { data: Datum[] }) {
  const W = 760;
  const H = 480;
  // Wide right padding reserves a column for the label callouts and their leader lines.
  const PAD = { top: 40, right: 200, bottom: 64, left: 68 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const xSpan = log10(X_MAX) - log10(X_MIN);
  const ySpan = log10(Y_MAX) - log10(Y_MIN);

  const x = (roles: number) =>
    PAD.left + ((log10(roles) - log10(X_MIN)) / xSpan) * innerW;
  const y = (orgs: number) =>
    PAD.top + innerH - ((log10(orgs) - log10(Y_MIN)) / ySpan) * innerH;

  const axisBottomY = PAD.top + innerH;

  // Bubbles in plot coordinates. Computed once so labels can sort by them.
  const bubbles = data.map((d) => ({
    ...d,
    cx: x(d.roles),
    cy: y(d.orgs),
    r: 10,
  }));

  // Label callout column.
  const LABEL_COL_X = W - PAD.right + 28; // small gap from plot edge
  const LABEL_TOP = PAD.top + 10;
  const LABEL_BOTTOM = PAD.top + innerH - 10;
  // Sort top-to-bottom by bubble cy ascending so leader lines never cross.
  const labelOrder = [...bubbles].sort((a, b) => a.cy - b.cy);
  const labelStep =
    labelOrder.length > 1
      ? (LABEL_BOTTOM - LABEL_TOP) / (labelOrder.length - 1)
      : 0;
  const labelMeta = labelOrder.map((b, i) => ({
    bubble: b,
    labelX: LABEL_COL_X,
    labelY: LABEL_TOP + i * labelStep,
  }));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label="Log-log scatter plot of UN digital segments by role volume versus organisations hiring"
    >
      <g
        fontFamily="var(--font-sans)"
        style={{ fontVariantNumeric: "tabular-nums lining-nums" }}
      >
        {/* Y gridlines */}
        {Y_TICKS.map((t) => (
          <line
            key={`yg-${t}`}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(t)}
            y2={y(t)}
            stroke="#E5D9C8"
            strokeWidth={1}
          />
        ))}

        {/* X-axis line */}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={axisBottomY}
          y2={axisBottomY}
          stroke="#E5D9C8"
          strokeWidth={1}
        />

        {/* X tick labels */}
        {X_TICKS.map((t) => (
          <text
            key={`xt-${t}`}
            x={x(t)}
            y={axisBottomY + 18}
            fontSize={12}
            fill="#66788A"
            textAnchor="middle"
          >
            {t}
          </text>
        ))}

        {/* Y tick labels */}
        {Y_TICKS.map((t) => (
          <text
            key={`yt-${t}`}
            x={PAD.left - 10}
            y={y(t) + 4}
            fontSize={12}
            fill="#66788A"
            textAnchor="end"
          >
            {t}
          </text>
        ))}

        {/* X-axis title */}
        <text
          x={PAD.left + innerW / 2}
          y={axisBottomY + 42}
          fontSize={12}
          fill="#66788A"
          textAnchor="middle"
        >
          Roles posted
        </text>

        {/* Y-axis title */}
        <text
          transform={`translate(${PAD.left - 44}, ${PAD.top + innerH / 2}) rotate(-90)`}
          fontSize={12}
          fill="#66788A"
          textAnchor="middle"
        >
          Organisations hiring
        </text>

        {/* Q4 → Q1 slope arrows (horizontal). Drawn behind bubbles so the
            current-period dot stays the visual focus. Y-coordinate is held at
            the current-period orgs count — Q4 org breakdown is not stored. */}
        <defs>
          <marker
            id="slope-arrow-up"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 Z" fill="#00A0B0" />
          </marker>
          <marker
            id="slope-arrow-down"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 Z" fill="#990F3D" />
          </marker>
        </defs>
        {bubbles.map((b) => {
          if (b.q4Roles == null) return null;
          const dRoles = b.roles - b.q4Roles;
          if (Math.abs(dRoles) < 1) return null;
          const grew = dRoles > 0;
          const fromX = x(Math.max(b.q4Roles, X_MIN));
          const toX = x(Math.max(b.roles, X_MIN));
          // Arrow stops short of the bubble so the bubble caps it cleanly.
          const trimmed = grew ? toX - (b.r + 3) : toX + (b.r + 3);
          return (
            <line
              key={`slope-${b.segment}`}
              x1={fromX}
              y1={b.cy}
              x2={trimmed}
              y2={b.cy}
              stroke={grew ? "#00A0B0" : "#990F3D"}
              strokeOpacity={0.55}
              strokeWidth={1.5}
              markerEnd={grew ? "url(#slope-arrow-up)" : "url(#slope-arrow-down)"}
            />
          );
        })}

        {/* Leader lines first so the bubble caps each line cleanly */}
        {labelMeta.map((m) => {
          const end = lineEndAt(
            { x: m.labelX, y: m.labelY },
            { cx: m.bubble.cx, cy: m.bubble.cy, r: m.bubble.r },
          );
          return (
            <line
              key={`leader-${m.bubble.segment}`}
              x1={m.labelX - 4}
              y1={m.labelY}
              x2={end.x}
              y2={end.y}
              stroke="#0A3C5A"
              strokeOpacity={0.4}
              strokeWidth={1}
            />
          );
        })}

        {/* Bubbles */}
        {bubbles.map((b) => {
          const fill = HIGHLIGHT.has(b.segment) ? "#00A0B0" : "#0A3C5A";
          return (
            <circle
              key={`bubble-${b.segment}`}
              cx={b.cx}
              cy={b.cy}
              r={b.r}
              fill={fill}
            />
          );
        })}

        {/* Label callouts in the right column */}
        {labelMeta.map((m) => {
          const fill = HIGHLIGHT.has(m.bubble.segment) ? "#00A0B0" : "#0A3C5A";
          const isHighlight = HIGHLIGHT.has(m.bubble.segment);
          const dStr = m.bubble.delta != null ? fmtDelta(m.bubble.delta) : "";
          return (
            <g key={`label-${m.bubble.segment}`}>
              <circle cx={m.labelX} cy={m.labelY} r={4} fill={fill} />
              <text
                x={m.labelX + 10}
                y={m.labelY + 4}
                fontSize={12}
                fontWeight={isHighlight ? 600 : 500}
                fill="#0A3C5A"
                textAnchor="start"
              >
                {m.bubble.label}
              </text>
              <text
                x={m.labelX + 10}
                y={m.labelY + 18}
                fontSize={11}
                fill="#66788A"
                textAnchor="start"
              >
                {m.bubble.roles}r · {m.bubble.orgs}o
                {dStr && (
                  <tspan
                    fill={
                      m.bubble.delta && m.bubble.delta > 0
                        ? "#00A0B0"
                        : "#990F3D"
                    }
                    fontWeight={600}
                    dx="6"
                  >
                    {dStr}
                  </tspan>
                )}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
