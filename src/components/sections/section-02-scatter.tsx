"use client";

interface Datum {
  segment: string;
  label: string;
  roles: number;
  orgs: number;
}

const HIGHLIGHT = new Set(["ITOPS", "DATA_AI"]);

const X_TICKS = [0, 10, 25, 50, 100, 150];
const Y_TICKS = [0, 5, 10, 15, 20, 25];

// Deterministic per-segment label placement: manually tuned against the
// Q1 2026 seed so the nine labels never collide in the bottom-left cluster.
type Anchor = "start" | "middle" | "end";
const LABEL_POS: Record<
  string,
  { dx: number; dy: number; anchor: Anchor }
> = {
  ITOPS:           { dx:   0, dy: -20, anchor: "end"    },
  DATA_AI:         { dx:   0, dy: -20, anchor: "middle" },
  POLICY_ADVISORY: { dx:  14, dy:   4, anchor: "start"  },
  INFO_KM:         { dx:   0, dy: -16, anchor: "middle" },
  CYBER:           { dx:   0, dy:  20, anchor: "middle" },
  SOFTWARE:        { dx:  14, dy: -14, anchor: "start"  },
  PRODUCT:         { dx: -14, dy: -18, anchor: "end"    },
  CLOUD:           { dx: -14, dy: -20, anchor: "end"    },
  ENTERPRISE:      { dx:  14, dy:  20, anchor: "start"  },
};

export function SegmentScatter({ data }: { data: Datum[] }) {
  const W = 760;
  const H = 460;
  const PAD = { top: 52, right: 24, bottom: 48, left: 52 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxRoles = Math.max(10, ...data.map((d) => d.roles));
  const maxOrgs = Math.max(5, ...data.map((d) => d.orgs));
  const xDomainMax = Math.sqrt(maxRoles * 1.15);
  const yDomainMax = Math.sqrt(maxOrgs * 1.15);

  const x = (roles: number) =>
    PAD.left + (Math.sqrt(Math.max(0, roles)) / xDomainMax) * innerW;
  const y = (orgs: number) =>
    PAD.top + innerH - (Math.sqrt(Math.max(0, orgs)) / yDomainMax) * innerH;

  const itops = data.find((d) => d.segment === "ITOPS");
  const enterprise = data.find((d) => d.segment === "ENTERPRISE");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label="Scatter plot of UN digital segments by role volume versus organisations hiring"
    >
      <g
        fontFamily="var(--font-sans)"
        style={{ fontVariantNumeric: "tabular-nums lining-nums" }}
      >
        {/* Y gridlines (major ticks only) */}
        {Y_TICKS.filter((t) => t <= maxOrgs * 1.15).map((t) => (
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

        {/* X-axis tick labels */}
        {X_TICKS.filter((t) => t <= maxRoles * 1.15).map((t) => (
          <text
            key={`xt-${t}`}
            x={x(t)}
            y={H - PAD.bottom + 18}
            fontSize={12}
            fill="#66788A"
            textAnchor="middle"
          >
            {t}
          </text>
        ))}

        {/* Y-axis tick labels */}
        {Y_TICKS.filter((t) => t <= maxOrgs * 1.15).map((t) => (
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

        {/* Axis titles */}
        <text
          x={PAD.left}
          y={H - 8}
          fontSize={12}
          fill="#66788A"
          textAnchor="start"
        >
          Roles posted in Q1 2026 →
        </text>
        <text
          x={PAD.left - 40}
          y={PAD.top - 16}
          fontSize={12}
          fill="#66788A"
          textAnchor="start"
        >
          Organisations hiring
        </text>

        {/* Bubbles + labels */}
        {data.map((d) => {
          const fill = HIGHLIGHT.has(d.segment) ? "#00A0B0" : "#0A3C5A";
          const pos = LABEL_POS[d.segment] ?? {
            dx: 14,
            dy: 4,
            anchor: "start" as const,
          };
          const cx = x(d.roles);
          const cy = y(d.orgs);
          const isItops = d.segment === "ITOPS";
          const isEnterprise = d.segment === "ENTERPRISE";

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
              {/* Stats sub-label for the two annotated bubbles */}
              {isItops && itops && (
                <text
                  x={cx + pos.dx}
                  y={cy + pos.dy + 16}
                  fontSize={12}
                  fontStyle="italic"
                  fill="#66788A"
                  textAnchor={pos.anchor}
                >
                  {itops.roles} roles across {itops.orgs} orgs
                </text>
              )}
              {isEnterprise && enterprise && (
                <text
                  x={cx + pos.dx}
                  y={cy + pos.dy + 16}
                  fontSize={12}
                  fontStyle="italic"
                  fill="#66788A"
                  textAnchor={pos.anchor}
                >
                  {enterprise.roles} role
                  {enterprise.roles === 1 ? "" : "s"}, {enterprise.orgs} org
                  {enterprise.orgs === 1 ? "" : "s"} — a niche
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
