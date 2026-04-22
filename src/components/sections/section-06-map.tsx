"use client";
import { useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import { SEGMENT_LABELS } from "@/lib/segments";

interface Station {
  lat: number;
  lng: number;
  country: string;
}

interface Point {
  name: string;
  lat: number;
  lng: number;
  count: number;
  orgs: number;
  segments: string[];
  country: string;
  rank: number;
}

interface Input {
  locationOrCountry: string;
  count: number;
  orgs: number;
  topSegments: string[];
}

const WORLD_TOPO = "/maps/countries-110m.json";

const GEO_STYLE = {
  default: { fill: "#E7EBF0", stroke: "#C9D1DA", strokeWidth: 0.4, outline: "none" },
  hover:   { fill: "#D5DCE5", stroke: "#C9D1DA", strokeWidth: 0.4, outline: "none" },
  pressed: { fill: "#D5DCE5", stroke: "#C9D1DA", strokeWidth: 0.4, outline: "none" },
};

function normaliseKey(loc: string): string {
  const cleaned = loc.toLowerCase().replace(/\(.+?\)/g, "");
  const first = cleaned.split(",")[0] ?? cleaned;
  return first.trim();
}

function tealScale(orgs: number): string {
  const clamped = Math.min(5, Math.max(1, orgs));
  const lightness = 70 - (clamped - 1) * 7;
  return `hsl(177, 37%, ${lightness}%)`;
}

function bubbleRadius(count: number, maxCount: number): number {
  const minR = 3;
  const maxR = 18;
  if (maxCount <= 0) return minR;
  const ratio = Math.sqrt(count) / Math.sqrt(maxCount);
  return minR + (maxR - minR) * ratio;
}

function Tooltip({ point }: { point: Point | null }) {
  if (!point) return null;
  return (
    <div className="absolute top-2 right-2 bg-white border border-panel-line rounded-md shadow-sm p-3 text-xs max-w-[260px] pointer-events-none">
      <p className="font-serif text-sm text-navy">
        {point.name}
        <span className="text-muted font-sans ml-2">{point.country}</span>
      </p>
      <p className="mt-1 text-navy">
        <strong>{point.count}</strong> digital role
        {point.count === 1 ? "" : "s"} · {point.orgs}{" "}
        organisation{point.orgs === 1 ? "" : "s"}
      </p>
      {point.segments.length > 0 && (
        <p className="mt-1 text-muted">
          Top segment{point.segments.length > 1 ? "s" : ""}:{" "}
          {point.segments
            .slice(0, 3)
            .map(
              (s) =>
                SEGMENT_LABELS[s as keyof typeof SEGMENT_LABELS] ?? s,
            )
            .join(" · ")}
        </p>
      )}
    </div>
  );
}

function Bubbles({
  points,
  maxCount,
  onHover,
  showLabels,
}: {
  points: Point[];
  maxCount: number;
  onHover: (p: Point | null) => void;
  showLabels: boolean;
}) {
  return (
    <>
      {points.map((p) => (
        <Marker key={p.name} coordinates={[p.lng, p.lat]}>
          <circle
            r={bubbleRadius(p.count, maxCount)}
            fill={tealScale(p.orgs)}
            fillOpacity={0.75}
            stroke="#0F2540"
            strokeWidth={0.8}
            onMouseEnter={() => onHover(p)}
            onMouseLeave={() => onHover(null)}
          >
            <title>{`${p.name}: ${p.count} roles, ${p.orgs} orgs`}</title>
          </circle>
          {showLabels && p.rank <= 8 && (
            <text
              x={bubbleRadius(p.count, maxCount) + 4}
              y={4}
              style={{
                fontFamily: "var(--font-sans), system-ui",
                fontSize: 10,
                fill: "#0F2540",
                pointerEvents: "none",
              }}
            >
              {p.name} · {p.count}
            </text>
          )}
        </Marker>
      ))}
    </>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted">
      <span className="flex items-center gap-1">
        <span className="inline-block w-4 h-4 rounded-full bg-teal/40 border border-navy" />
        bubble size = digital roles
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block w-4 h-4 rounded-full" style={{ background: tealScale(1), border: "1px solid #0F2540" }} />
        1 org
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block w-4 h-4 rounded-full" style={{ background: tealScale(5), border: "1px solid #0F2540" }} />
        5+ orgs
      </span>
    </div>
  );
}

export function DutyStationMaps({
  rows,
  stations,
}: {
  rows: Input[];
  stations: Record<string, Station>;
}) {
  const [hover, setHover] = useState<Point | null>(null);

  const points: Point[] = useMemo(() => {
    const matched: Point[] = [];
    for (const r of rows) {
      const key = normaliseKey(r.locationOrCountry);
      const s = stations[key];
      if (!s) continue;
      matched.push({
        name: key.replace(/\b\w/g, (c) => c.toUpperCase()),
        lat: s.lat,
        lng: s.lng,
        country: s.country,
        count: r.count,
        orgs: r.orgs,
        segments: r.topSegments,
        rank: 0,
      });
    }
    matched.sort((a, b) => b.count - a.count);
    const top = matched.slice(0, 30);
    return top.map((p, i) => ({ ...p, rank: i + 1 }));
  }, [rows, stations]);

  const maxCount = points[0]?.count ?? 0;

  if (points.length === 0) {
    return (
      <p className="text-sm text-muted">
        Map will populate after the first Lambda snapshot. The 8-column
        reference CSV committed to the repo lacks location data; live
        Supabase fetch captures it.
      </p>
    );
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative panel p-2 overflow-hidden">
          <p className="text-xs uppercase tracking-wide text-muted px-2 pt-1">
            Global
          </p>
          <ComposableMap
            projection="geoEqualEarth"
            width={640}
            height={360}
            projectionConfig={{ scale: 135 }}
            style={{ width: "100%", height: "auto" }}
          >
            <Geographies geography={WORLD_TOPO}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    style={GEO_STYLE}
                  />
                ))
              }
            </Geographies>
            <Bubbles
              points={points}
              maxCount={maxCount}
              onHover={setHover}
              showLabels
            />
          </ComposableMap>
        </div>
        <div className="relative panel p-2 overflow-hidden">
          <p className="text-xs uppercase tracking-wide text-teal px-2 pt-1">
            European cluster (detail)
          </p>
          <ComposableMap
            projection="geoMercator"
            width={640}
            height={360}
            projectionConfig={{ center: [10, 50], scale: 700 }}
            style={{ width: "100%", height: "auto" }}
          >
            <Geographies geography={WORLD_TOPO}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    style={GEO_STYLE}
                  />
                ))
              }
            </Geographies>
            <Bubbles
              points={points.filter(
                (p) => p.lng >= -12 && p.lng <= 35 && p.lat >= 34 && p.lat <= 60,
              )}
              maxCount={maxCount}
              onHover={setHover}
              showLabels
            />
          </ComposableMap>
        </div>
      </div>
      <div className="mt-4">
        <Legend />
      </div>
      <Tooltip point={hover} />
    </div>
  );
}
