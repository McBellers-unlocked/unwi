import type { CollisionProfiles } from "@/lib/db/schema";

type Profile = CollisionProfiles["profiles"][number];

const MAX_ROWS = 12;
const MAX_COLS = 16;
const ROW_LABEL_W = 230;
const RIGHT_TOTAL_W = 80;
const ROW_H = 28;
const COL_W = 44;
const HEADER_H = 110;

/**
 * Cell shading. Below the cap, opacity scales with count; above the
 * cap, switch to navy so dense cells visibly outrank shallow ones —
 * matches the FT mockup's "Colour caps at 4 for legibility" treatment.
 */
const CAP = 4;
const COLOR_HIGHLIGHT = "#00A0B0";
const COLOR_ANCHOR = "#0A3C5A";
const COLOR_RULE = "#E5D9C8";
const COLOR_INK_MUTED = "#66788A";
const COLOR_INK_PRIMARY = "#0A3C5A";

function cellFillForCount(count: number): string {
  if (count <= 0) return COLOR_RULE;
  if (count >= CAP) return COLOR_ANCHOR;
  // 1 → 0.30, 2 → 0.55, 3 → 0.85
  const opacity = 0.3 + ((count - 1) / (CAP - 1)) * 0.55;
  return `rgba(0, 160, 176, ${opacity.toFixed(2)})`;
}

function cellFillBinary(present: boolean): string {
  return present ? COLOR_HIGHLIGHT : COLOR_RULE;
}

function textColorForCount(count: number): string {
  return count >= CAP ? "#FFFFFF" : COLOR_INK_PRIMARY;
}

interface HeatmapProps {
  profiles: Profile[];
}

export function CollisionHeatmap({ profiles }: HeatmapProps) {
  const top = profiles
    .slice()
    .sort((a, b) => b.organisation_count - a.organisation_count)
    .slice(0, MAX_ROWS);

  if (top.length === 0) {
    return (
      <p className="text-caption text-ink-muted">
        No collision profiles in the latest snapshot.
      </p>
    );
  }

  const orgFreq = new Map<string, number>();
  for (const p of top) {
    for (const o of p.organisations) {
      orgFreq.set(o, (orgFreq.get(o) ?? 0) + 1);
    }
  }
  const orgsAll = Array.from(orgFreq.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([o]) => o);
  const orgs = orgsAll.slice(0, MAX_COLS);
  const overflowOrgs = orgsAll.length - orgs.length;

  const W = ROW_LABEL_W + orgs.length * COL_W + RIGHT_TOTAL_W;
  const H = HEADER_H + top.length * ROW_H + 24;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label="Cross-agency collision heatmap of canonical role titles by organisation"
        style={{ maxWidth: "100%" }}
      >
        <g
          fontFamily="var(--font-sans)"
          style={{ fontVariantNumeric: "tabular-nums lining-nums" }}
        >
          {/* Column headers — org names, rotated −45° */}
          {orgs.map((o, i) => {
            const cx = ROW_LABEL_W + i * COL_W + COL_W / 2;
            const cy = HEADER_H - 6;
            return (
              <text
                key={`col-${o}`}
                transform={`translate(${cx}, ${cy}) rotate(-45)`}
                fontSize={11}
                fill={COLOR_INK_MUTED}
                textAnchor="start"
              >
                {o}
              </text>
            );
          })}

          {/* Right-margin column header */}
          <text
            x={ROW_LABEL_W + orgs.length * COL_W + 12}
            y={HEADER_H - 6}
            fontSize={10}
            fill={COLOR_INK_MUTED}
            fontWeight={500}
            style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}
          >
            Total orgs
          </text>

          {/* Rows */}
          {top.map((p, rowIdx) => {
            const y = HEADER_H + rowIdx * ROW_H;
            const counts = p.posting_counts;
            const orgSet = new Set(p.organisations);

            return (
              <g key={`${p.canonical_title}-${p.segment}`}>
                {/* Row label */}
                <text
                  x={ROW_LABEL_W - 12}
                  y={y + ROW_H / 2 + 4}
                  fontSize={12}
                  fontWeight={500}
                  fill={COLOR_INK_PRIMARY}
                  textAnchor="end"
                >
                  {p.canonical_title}
                </text>

                {/* Cells */}
                {orgs.map((o, colIdx) => {
                  const x = ROW_LABEL_W + colIdx * COL_W;
                  const has = orgSet.has(o);
                  const count = counts ? (counts[o] ?? 0) : has ? 1 : 0;
                  const fill = counts
                    ? cellFillForCount(count)
                    : cellFillBinary(has);
                  return (
                    <g key={`${p.canonical_title}-${o}`}>
                      <rect
                        x={x + 1}
                        y={y + 1}
                        width={COL_W - 2}
                        height={ROW_H - 2}
                        fill={fill}
                      />
                      {counts && count > 0 && (
                        <text
                          x={x + COL_W / 2}
                          y={y + ROW_H / 2 + 4}
                          fontSize={12}
                          fontWeight={600}
                          fill={textColorForCount(count)}
                          textAnchor="middle"
                          fontFamily="var(--font-serif)"
                        >
                          {count}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Right-margin total */}
                <text
                  x={ROW_LABEL_W + orgs.length * COL_W + 12}
                  y={y + ROW_H / 2 + 4}
                  fontSize={12}
                  fontWeight={500}
                  fill={COLOR_INK_PRIMARY}
                  fontFamily="var(--font-serif)"
                >
                  {p.organisation_count}
                  <tspan
                    fill={COLOR_INK_MUTED}
                    fontWeight={400}
                    fontFamily="var(--font-sans)"
                    fontSize={11}
                  >
                    {" "}orgs
                  </tspan>
                </text>
              </g>
            );
          })}

          {/* Bottom rule */}
          <line
            x1={ROW_LABEL_W}
            x2={ROW_LABEL_W + orgs.length * COL_W}
            y1={HEADER_H + top.length * ROW_H}
            y2={HEADER_H + top.length * ROW_H}
            stroke={COLOR_RULE}
            strokeWidth={1}
          />

          {/* Overflow caption */}
          {overflowOrgs > 0 && (
            <text
              x={ROW_LABEL_W}
              y={HEADER_H + top.length * ROW_H + 18}
              fontSize={11}
              fill={COLOR_INK_MUTED}
            >
              + {overflowOrgs} other{overflowOrgs === 1 ? "" : "s"} organisation
              {overflowOrgs === 1 ? "" : "s"} in the long tail
            </text>
          )}
        </g>
      </svg>
    </div>
  );
}
