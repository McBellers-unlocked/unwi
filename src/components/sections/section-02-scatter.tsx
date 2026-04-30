"use client";

import { placeLabels, type Reservation } from "./section-02-labels";

export interface ScatterDatum {
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

const LABEL_FONT_PX = 13;
const LABEL_CHAR_PX = 6.5;
const BUBBLE_R = 10;

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

function lineBBox(
  a: { x: number; y: number },
  b: { x: number; y: number },
  pad = 4,
) {
  const x = Math.min(a.x, b.x) - pad;
  const y = Math.min(a.y, b.y) - pad;
  const w = Math.abs(a.x - b.x) + 2 * pad;
  const h = Math.abs(a.y - b.y) + 2 * pad;
  return { x, y, w, h };
}

function textBBox(
  x: number,
  y: number,
  anchor: "start" | "middle" | "end",
  text: string,
  fontPx: number = LABEL_FONT_PX,
  charPx: number = LABEL_CHAR_PX,
) {
  const w = text.length * charPx;
  const h = fontPx * 1.2;
  const ascent = h * 0.8;
  const left = anchor === "start" ? x : anchor === "end" ? x - w : x - w / 2;
  return { x: left, y: y - ascent, w, h };
}

export function SegmentScatter({
  data,
  window,
}: {
  data: ScatterDatum[];
  window: 30 | 60 | 90;
}) {
  const W = 760;
  const H = 480;
  const PAD = { top: 40, right: 40, bottom: 64, left: 68 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const plot = {
    x0: PAD.left,
    y0: PAD.top,
    x1: PAD.left + innerW,
    y1: PAD.top + innerH,
  };

  const xSpan = log10(X_MAX) - log10(X_MIN);
  const ySpan = log10(Y_MAX) - log10(Y_MIN);

  const x = (roles: number) =>
    PAD.left + ((log10(roles) - log10(X_MIN)) / xSpan) * innerW;
  const y = (orgs: number) =>
    PAD.top + innerH - ((log10(orgs) - log10(Y_MIN)) / ySpan) * innerH;

  const axisBottomY = PAD.top + innerH;

  const itops = data.find((d) => d.segment === "ITOPS");
  const enterprise = data.find((d) => d.segment === "ENTERPRISE");

  // Editorial callouts. Anchor offsets keep the callout near its bubble across
  // any window, with guards for empty windows where the segment has no data.
  type Callout = {
    text: string;
    textPos: { x: number; y: number };
    anchor: "start" | "middle" | "end";
    lineEnd: { x: number; y: number };
    textBox: { x: number; y: number; w: number; h: number };
    lineBox: { x: number; y: number; w: number; h: number };
  };

  const callouts: Callout[] = [];

  if (itops && itops.roles > 0 && itops.orgs > 0) {
    const cx = x(itops.roles);
    const cy = y(itops.orgs);
    const text = `${itops.roles} roles across ${itops.orgs} orgs`;
    const textPos = { x: cx - 28, y: cy - 32 };
    const lineEnd = lineEndAt(textPos, { cx, cy, r: BUBBLE_R });
    callouts.push({
      text,
      textPos,
      anchor: "end",
      lineEnd,
      textBox: textBBox(textPos.x, textPos.y, "end", text),
      lineBox: lineBBox(textPos, lineEnd),
    });
  }

  if (enterprise && enterprise.roles > 0 && enterprise.orgs > 0) {
    const cx = x(enterprise.roles);
    const cy = y(enterprise.orgs);
    const text = `${enterprise.roles} role${enterprise.roles === 1 ? "" : "s"}, ${enterprise.orgs} org${enterprise.orgs === 1 ? "" : "s"} — a niche`;
    const textPos = { x: cx + 30, y: cy + 28 };
    const lineEnd = lineEndAt(textPos, { cx, cy, r: BUBBLE_R });
    callouts.push({
      text,
      textPos,
      anchor: "start",
      lineEnd,
      textBox: textBBox(textPos.x, textPos.y, "start", text),
      lineBox: lineBBox(textPos, lineEnd),
    });
  }

  const reserved: Reservation[] = callouts.flatMap((c) => [
    { bbox: c.textBox },
    { bbox: c.lineBox },
  ]);

  const bubbles = data.map((d) => ({
    id: d.segment,
    cx: x(d.roles),
    cy: y(d.orgs),
    r: BUBBLE_R,
  }));

  const placed = placeLabels({
    bubbles,
    labels: data.map((d) => ({
      id: d.segment,
      text: d.label,
      // Highlighted segments + dense areas get first pick.
      priority: (HIGHLIGHT.has(d.segment) ? 1000 : 0) + d.roles,
    })),
    reserved,
    fontPx: LABEL_FONT_PX,
    charPx: LABEL_CHAR_PX,
    plot,
  });
  const placeById = new Map(placed.map((p) => [p.id, p] as const));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label={`Log-log scatter plot of UN digital segments by role volume versus organisations hiring, last ${window} days`}
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
          Roles posted in last {window} days
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

        {/* Editorial leader lines + callouts (drawn before bubbles so the
            bubble visually caps the line) */}
        {callouts.map((c, i) => (
          <g key={`callout-${i}`}>
            <line
              x1={c.textPos.x}
              y1={c.textPos.y - 4}
              x2={c.lineEnd.x}
              y2={c.lineEnd.y}
              stroke="#0A3C5A"
              strokeWidth={1.5}
            />
            <text
              x={c.textPos.x}
              y={c.textPos.y}
              fontSize={13}
              fontWeight={500}
              fill="#0A3C5A"
              textAnchor={c.anchor}
            >
              {c.text}
            </text>
          </g>
        ))}

        {/* Bubbles + auto-placed segment labels */}
        {data.map((d) => {
          const fill = HIGHLIGHT.has(d.segment) ? "#00A0B0" : "#0A3C5A";
          const cx = x(d.roles);
          const cy = y(d.orgs);
          const p = placeById.get(d.segment);

          return (
            <g key={d.segment}>
              <circle cx={cx} cy={cy} r={BUBBLE_R} fill={fill} />
              {p && (
                <text
                  x={p.x}
                  y={p.y}
                  fontSize={LABEL_FONT_PX}
                  fontWeight={500}
                  fill="#0A3C5A"
                  textAnchor={p.anchor}
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
