"use client";

interface Datum {
  segment: string;
  label: string;
  roles: number;
  orgs: number;
}

const HIGHLIGHT = new Set(["ITOPS", "DATA_AI"]);

// Log-spaced ticks with literal tick values (FT convention — log layout, linear labels).
const X_TICKS = [1, 3, 10, 30, 100];
const Y_TICKS = [1, 3, 10, 30];
// Axis domain matches the outermost tick so tick marks land on the gridlines.
const X_MIN = 1;
const X_MAX = 150;
const Y_MIN = 1;
const Y_MAX = 30;

type Anchor = "start" | "middle" | "end";
// Label placement, hand-tuned against the log-scale positions so no label
// overlaps any other label or any bubble in the 9-segment dataset.
const LABEL_POS: Record<string, { dx: number; dy: number; anchor: Anchor }> = {
  ITOPS:           { dx:   0, dy: -16, anchor: "end"    },
  DATA_AI:         { dx: -14, dy:   4, anchor: "end"    },
  POLICY_ADVISORY: { dx:  14, dy:   4, anchor: "start"  },
  INFO_KM:         { dx:   0, dy: -14, anchor: "middle" },
  CYBER:           { dx: -14, dy:   4, anchor: "end"    },
  SOFTWARE:        { dx:  14, dy:   4, anchor: "start"  },
  PRODUCT:         { dx: -14, dy:   4, anchor: "end"    },
  CLOUD:           { dx:  14, dy:   4, anchor: "start"  },
  ENTERPRISE:      { dx:  14, dy:   4, anchor: "start"  },
};

function log10(v: number): number {
  return Math.log10(Math.max(v, 1e-6));
}

// Ends a leader line just outside the bubble edge so the line visibly points
// at the dot without overlapping the fill.
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

export function SegmentScatter({ data }: { data: Datum[] }) {
  const W = 760;
  const H = 480;
  const PAD = { top: 40, right: 40, bottom: 64, left: 68 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const xSpan = log10(X_MAX) - log10(X_MIN);
  const ySpan = log10(Y_MAX) - log10(Y_MIN);

  const x = (roles: number) =>
    PAD.left + ((log10(roles) - log10(X_MIN)) / xSpan) * innerW;
  const y = (orgs: number) =>
    PAD.top + innerH - ((log10(orgs) - log10(Y_MIN)) / ySpan) * innerH;

  const axisBottomY = PAD.top + innerH;

  const itops = data.find((d) => d.segment === "ITOPS");
  const enterprise = data.find((d) => d.segment === "ENTERPRISE");

  // Annotation anchor positions in plot coordinates.
  const itopsAnnoText = { x: 520, y: 145 };
  const enterpriseAnnoText = { x: 340, y: 385 };

  const itopsLineEnd = itops
    ? lineEndAt(
        itopsAnnoText,
        { cx: x(itops.roles), cy: y(itops.orgs), r: 10 },
      )
    : null;
  const enterpriseLineEnd = enterprise
    ? lineEndAt(
        enterpriseAnnoText,
        { cx: x(enterprise.roles), cy: y(enterprise.orgs), r: 10 },
      )
    : null;

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

        {/* X-axis title — directly below the tick labels, centred on plot */}
        <text
          x={PAD.left + innerW / 2}
          y={axisBottomY + 42}
          fontSize={12}
          fill="#66788A"
          textAnchor="middle"
        >
          Roles posted in Q1 2026
        </text>

        {/* Y-axis title — rotated vertical, centred on plot height */}
        <text
          transform={`translate(${PAD.left - 44}, ${PAD.top + innerH / 2}) rotate(-90)`}
          fontSize={12}
          fill="#66788A"
          textAnchor="middle"
        >
          Organisations hiring
        </text>

        {/* Leader lines + annotation text — drawn before bubbles so the
            bubble circle visually "caps" the line */}
        {itops && itopsLineEnd && (
          <g>
            <line
              x1={itopsAnnoText.x}
              y1={itopsAnnoText.y - 4}
              x2={itopsLineEnd.x}
              y2={itopsLineEnd.y}
              stroke="#0A3C5A"
              strokeWidth={1.5}
            />
            <text
              x={itopsAnnoText.x}
              y={itopsAnnoText.y}
              fontSize={13}
              fontWeight={500}
              fill="#0A3C5A"
              textAnchor="end"
            >
              {itops.roles} roles across {itops.orgs} orgs
            </text>
          </g>
        )}
        {enterprise && enterpriseLineEnd && (
          <g>
            <line
              x1={enterpriseAnnoText.x}
              y1={enterpriseAnnoText.y - 4}
              x2={enterpriseLineEnd.x}
              y2={enterpriseLineEnd.y}
              stroke="#0A3C5A"
              strokeWidth={1.5}
            />
            <text
              x={enterpriseAnnoText.x}
              y={enterpriseAnnoText.y}
              fontSize={13}
              fontWeight={500}
              fill="#0A3C5A"
              textAnchor="start"
            >
              {enterprise.roles} role
              {enterprise.roles === 1 ? "" : "s"}, {enterprise.orgs} org
              {enterprise.orgs === 1 ? "" : "s"} — a niche
            </text>
          </g>
        )}

        {/* Bubbles + segment labels */}
        {data.map((d) => {
          const fill = HIGHLIGHT.has(d.segment) ? "#00A0B0" : "#0A3C5A";
          const pos = LABEL_POS[d.segment] ?? {
            dx: 14,
            dy: 4,
            anchor: "start" as const,
          };
          const cx = x(d.roles);
          const cy = y(d.orgs);

          return (
            <g key={d.segment}>
              <circle cx={cx} cy={cy} r={10} fill={fill} />
              <text
                x={cx + pos.dx}
                y={cy + pos.dy}
                fontSize={13}
                fontWeight={500}
                fill="#0A3C5A"
                textAnchor={pos.anchor}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
