"use client";

type Point = { month: string; distinct_organisations: number };
type Segment = { segment: string; points: Point[] };

const SHORT_MONTH: Record<string, string> = {
  "01": "Jan",
  "02": "Feb",
  "03": "Mar",
  "04": "Apr",
  "05": "May",
  "06": "Jun",
  "07": "Jul",
  "08": "Aug",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Dec",
};

function fmtMonth(m: string): string {
  // "YYYY-MM" → "Mon"
  const mm = m.split("-")[1] ?? "";
  return SHORT_MONTH[mm] ?? m;
}

export function ConcurrencyChart({ segments }: { segments: Segment[] }) {
  const W = 760;
  const H = 400;
  const PAD = { top: 40, right: 172, bottom: 44, left: 52 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  // Collect all months across segments and sort chronologically.
  const monthSet = new Set<string>();
  for (const s of segments) {
    for (const p of s.points) monthSet.add(p.month);
  }
  const months = Array.from(monthSet).sort();
  if (months.length === 0) {
    return <div className="text-caption text-ink-muted">No concurrency data yet.</div>;
  }

  const dataAi = segments.find((s) => s.segment === "DATA_AI");
  const itops = segments.find((s) => s.segment === "ITOPS");
  const others = segments.filter(
    (s) => s.segment !== "DATA_AI" && s.segment !== "ITOPS",
  );

  // For each month, compute the max distinct_organisations across the
  // non-top-2 segments — this powers the faint "All other segments" band.
  const othersMax = months.map((m) => {
    let mx = 0;
    for (const s of others) {
      const pt = s.points.find((p) => p.month === m);
      if (pt && pt.distinct_organisations > mx) mx = pt.distinct_organisations;
    }
    return { month: m, v: mx };
  });

  const ymax =
    Math.max(
      0,
      ...segments.flatMap((s) => s.points.map((p) => p.distinct_organisations)),
    ) + 2;

  const xScale = (m: string) => {
    const i = months.indexOf(m);
    const t = months.length <= 1 ? 0 : i / (months.length - 1);
    return PAD.left + t * innerW;
  };
  const yScale = (v: number) =>
    PAD.top + innerH - (Math.min(v, ymax) / ymax) * innerH;

  // Y ticks, nice-rounded
  const yTicks = (() => {
    const step = ymax > 20 ? 5 : ymax > 10 ? 4 : 2;
    const ticks: number[] = [];
    for (let t = 0; t <= ymax; t += step) ticks.push(t);
    return ticks;
  })();

  function linePath(points: Point[]): string {
    if (points.length === 0) return "";
    const sorted = [...points].sort((a, b) => a.month.localeCompare(b.month));
    return sorted
      .map((p, i) => {
        const cx = xScale(p.month);
        const cy = yScale(p.distinct_organisations);
        return `${i === 0 ? "M" : "L"}${cx.toFixed(1)},${cy.toFixed(1)}`;
      })
      .join(" ");
  }

  function bandPath(band: { month: string; v: number }[]): string {
    if (band.length === 0) return "";
    const top = band
      .map((b, i) => `${i === 0 ? "M" : "L"}${xScale(b.month).toFixed(1)},${yScale(b.v).toFixed(1)}`)
      .join(" ");
    const lastX = xScale(band[band.length - 1]!.month);
    const firstX = xScale(band[0]!.month);
    const baseline = yScale(0);
    return `${top} L${lastX.toFixed(1)},${baseline.toFixed(1)} L${firstX.toFixed(1)},${baseline.toFixed(1)} Z`;
  }

  const dataAiPath = dataAi ? linePath(dataAi.points) : "";
  const itopsPath = itops ? linePath(itops.points) : "";
  const bandAreaPath = bandPath(othersMax);

  // Endpoint positions for labels
  const lastMonth = months[months.length - 1]!;
  const dataAiLast = dataAi?.points.find((p) => p.month === lastMonth);
  const itopsLast = itops?.points.find((p) => p.month === lastMonth);

  // Peak for Data/AI annotation
  const dataAiPeak = dataAi?.points.reduce<Point | null>(
    (best, p) =>
      !best || p.distinct_organisations > best.distinct_organisations
        ? p
        : best,
    null,
  );

  // Band label — place at rightmost point of band, above the line
  const bandLabel = othersMax[othersMax.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label="Distinct UN agencies hiring per digital segment, monthly"
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
            x={PAD.left - 10}
            y={yScale(t) + 4}
            fontSize={12}
            fill="#66788A"
            textAnchor="end"
          >
            {t}
          </text>
        ))}

        {/* X tick labels */}
        {months.map((m) => (
          <text
            key={`xt-${m}`}
            x={xScale(m)}
            y={H - PAD.bottom + 20}
            fontSize={12}
            fill="#66788A"
            textAnchor="middle"
          >
            {fmtMonth(m)}
          </text>
        ))}

        {/* Band for other segments */}
        {bandAreaPath && (
          <path d={bandAreaPath} fill="#E5D9C8" fillOpacity={0.8} />
        )}
        {bandLabel && bandLabel.v > 0 && (
          <text
            x={xScale(bandLabel.month) + 8}
            y={yScale(bandLabel.v) - 6}
            fontSize={12}
            fill="#66788A"
            fontStyle="italic"
          >
            All other segments
          </text>
        )}

        {/* Data/AI line — NAVY per spec for this section */}
        {dataAiPath && (
          <path
            d={dataAiPath}
            fill="none"
            stroke="#0A3C5A"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* IT Ops line — TEAL per spec */}
        {itopsPath && (
          <path
            d={itopsPath}
            fill="none"
            stroke="#00A0B0"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Endpoint labels */}
        {dataAiLast && (
          <text
            x={xScale(dataAiLast.month) + 10}
            y={yScale(dataAiLast.distinct_organisations) + 4}
            fontSize={13}
            fontWeight={500}
            fill="#0A3C5A"
          >
            Data, Analytics &amp; AI
          </text>
        )}
        {itopsLast && (
          <text
            x={xScale(itopsLast.month) + 10}
            y={yScale(itopsLast.distinct_organisations) + 4}
            fontSize={13}
            fontWeight={500}
            fill="#00A0B0"
          >
            IT Operations &amp; Support
          </text>
        )}

        {/* Peak annotation on Data/AI */}
        {dataAiPeak && (
          <g>
            <circle
              cx={xScale(dataAiPeak.month)}
              cy={yScale(dataAiPeak.distinct_organisations)}
              r={4}
              fill="#0A3C5A"
            />
            <text
              x={xScale(dataAiPeak.month)}
              y={yScale(dataAiPeak.distinct_organisations) - 14}
              fontSize={13}
              fontWeight={500}
              fontStyle="italic"
              fill="#0A3C5A"
              textAnchor="middle"
            >
              {dataAiPeak.distinct_organisations} agencies simultaneously
              in-market
            </text>
          </g>
        )}

        {/* Axis titles */}
        <text
          x={PAD.left}
          y={H - 6}
          fontSize={12}
          fill="#66788A"
        >
          Month →
        </text>
        <text
          x={PAD.left - 44}
          y={PAD.top - 14}
          fontSize={12}
          fill="#66788A"
        >
          Distinct agencies hiring
        </text>
      </g>
    </svg>
  );
}
