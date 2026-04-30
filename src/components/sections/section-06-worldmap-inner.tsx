"use client";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";

interface Point {
  name: string;
  lat: number;
  lng: number;
  count: number;
  /** Δ in role count over the active window. Optional. */
  delta?: number;
}

const WORLD_TOPO = "/maps/countries-110m.json";

// European bounding box — used to pull the cluster out for the circular inset.
const EUROPE_BBOX = { lngMin: -12, lngMax: 30, latMin: 35, latMax: 60 };

// Aurora's geography rows carry "City, Country" ("Geneva, Switzerland"); the
// local seed carries bare "Geneva"; some UNICC rows arrive as "Valencia (Spain)".
// Offset dicts key on the short city form, so normalise before lookup.
function labelKey(name: string): string {
  const stripped = name.replace(/\(.+?\)/g, "");
  const first = stripped.split(",")[0] ?? stripped;
  return first.trim();
}

type Anchor = "start" | "middle" | "end";
interface Offset {
  dx: number;
  dy: number;
  anchor: Anchor;
}
interface CityLabel {
  global?: Offset;
  inset?: Offset;
}

// Single source of truth for every duty-station label position. Adding a city
// in one place keeps global + inset in sync — previously two parallel dicts
// drifted (Valencia was added to inset only, leaving the global label missing).
const CITY_LABELS: Record<string, CityLabel> = {
  Geneva: {
    // Pulled left-up but kept inside the visible plot so the label doesn't
    // crowd the section title overhead.
    global: { dx: -88, dy: -38, anchor: "end" },
    inset: { dx: -22, dy: 14, anchor: "end" },
  },
  Rome: {
    global: { dx: 30, dy: 64, anchor: "start" },
    inset: { dx: -20, dy: 8, anchor: "end" },
  },
  "New York": {
    global: { dx: 64, dy: -28, anchor: "start" },
  },
  Amman: {
    global: { dx: 80, dy: 8, anchor: "start" },
  },
  Nairobi: {
    global: { dx: 70, dy: 22, anchor: "start" },
  },
  Vienna: {
    global: { dx: 26, dy: -32, anchor: "start" },
    inset: { dx: -20, dy: -4, anchor: "end" },
  },
  Copenhagen: {
    global: { dx: 22, dy: -22, anchor: "start" },
    inset: { dx: -16, dy: 6, anchor: "end" },
  },
  Bonn: {
    global: { dx: -18, dy: -22, anchor: "end" },
    inset: { dx: 12, dy: -16, anchor: "start" },
  },
  Paris: {
    global: { dx: -22, dy: 16, anchor: "end" },
    inset: { dx: 0, dy: 16, anchor: "middle" },
  },
  Valencia: {
    global: { dx: -22, dy: 24, anchor: "end" },
    inset: { dx: 16, dy: 4, anchor: "start" },
  },
  Madrid: {
    global: { dx: -18, dy: 22, anchor: "end" },
    inset: { dx: -16, dy: 4, anchor: "end" },
  },
  Brussels: {
    global: { dx: 22, dy: -18, anchor: "start" },
    inset: { dx: 14, dy: -10, anchor: "start" },
  },
  "The Hague": {
    global: { dx: -18, dy: -22, anchor: "end" },
    inset: { dx: -14, dy: -10, anchor: "end" },
  },
  Bangkok: {
    global: { dx: 22, dy: 22, anchor: "start" },
  },
  Manila: {
    global: { dx: 22, dy: -14, anchor: "start" },
  },
  Beirut: {
    global: { dx: 22, dy: -22, anchor: "start" },
  },
  "Addis Ababa": {
    global: { dx: 22, dy: 22, anchor: "start" },
  },
  Brindisi: {
    global: { dx: 16, dy: 22, anchor: "start" },
    inset: { dx: 14, dy: 8, anchor: "start" },
  },
  Florence: {
    inset: { dx: -14, dy: -8, anchor: "end" },
  },
  Budapest: {
    global: { dx: 22, dy: -10, anchor: "start" },
    inset: { dx: 14, dy: -4, anchor: "start" },
  },
  Gebze: {
    global: { dx: 22, dy: 22, anchor: "start" },
    inset: { dx: 14, dy: 8, anchor: "start" },
  },
};

// Fallback offset when a city in the top-5 isn't in CITY_LABELS — pushes
// upper-right and shows the label rather than silently dropping it.
const FALLBACK_GLOBAL: Offset = { dx: 22, dy: -14, anchor: "start" };

function radiusFromCount(count: number, maxCount: number): number {
  const minR = 4;
  const maxR = 32;
  if (maxCount <= 0) return minR;
  const ratio = Math.sqrt(count) / Math.sqrt(maxCount);
  return minR + (maxR - minR) * ratio;
}

function insetRadius(count: number, maxCount: number): number {
  const minR = 3;
  const maxR = 10;
  if (maxCount <= 0) return minR;
  const ratio = Math.sqrt(count) / Math.sqrt(maxCount);
  return minR + (maxR - minR) * ratio;
}

function fmtDelta(d: number | undefined): string {
  if (d == null) return "";
  const r = Math.round(d);
  if (r === 0) return "";
  return ` ${r > 0 ? "▲" : "▼"}${Math.abs(r)}`;
}

function deltaColor(d: number | undefined): string {
  if (d == null || Math.round(d) === 0) return "#66788A";
  return d > 0 ? "#00A0B0" : "#990F3D";
}

export function WorldMap({ points }: { points: Point[] }) {
  const maxCount = Math.max(1, ...points.map((p) => p.count));

  const europeanPoints = points
    .filter(
      (p) =>
        p.lng >= EUROPE_BBOX.lngMin &&
        p.lng <= EUROPE_BBOX.lngMax &&
        p.lat >= EUROPE_BBOX.latMin &&
        p.lat <= EUROPE_BBOX.latMax,
    )
    .slice(0, 10);

  return (
    <div className="relative w-full">
      <ComposableMap
        projection="geoEqualEarth"
        width={1200}
        height={560}
        projectionConfig={{ scale: 220 }}
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography={WORLD_TOPO}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                style={{
                  default: { fill: "#33302E", stroke: "none", outline: "none" },
                  hover:   { fill: "#33302E", stroke: "none", outline: "none" },
                  pressed: { fill: "#33302E", stroke: "none", outline: "none" },
                }}
              />
            ))
          }
        </Geographies>

        {points.map((p) => {
          const r = radiusFromCount(p.count, maxCount);
          return (
            <Marker key={p.name} coordinates={[p.lng, p.lat]}>
              <circle
                r={r}
                fill="#00A0B0"
                fillOpacity={0.4}
                stroke="#00A0B0"
                strokeWidth={2}
              />
            </Marker>
          );
        })}

        {points.slice(0, 5).map((p) => {
          const key = labelKey(p.name);
          const off = CITY_LABELS[key]?.global ?? FALLBACK_GLOBAL;
          const r = radiusFromCount(p.count, maxCount);
          const dist = Math.sqrt(off.dx * off.dx + off.dy * off.dy) || 1;
          const sx = (off.dx / dist) * (r + 2);
          const sy = (off.dy / dist) * (r + 2);
          const dStr = fmtDelta(p.delta);
          return (
            <Marker key={`lbl-${p.name}`} coordinates={[p.lng, p.lat]}>
              <line
                x1={sx}
                y1={sy}
                x2={off.dx}
                y2={off.dy}
                stroke="#0A3C5A"
                strokeWidth={1.5}
              />
              <text
                x={off.dx + (off.anchor === "start" ? 4 : off.anchor === "end" ? -4 : 0)}
                y={off.dy + 4}
                fontSize={13}
                fontWeight={500}
                fill="#0A3C5A"
                textAnchor={off.anchor}
                style={{
                  fontFamily: "var(--font-sans)",
                  paintOrder: "stroke",
                  stroke: "#FFF1E5",
                  strokeWidth: 4,
                  strokeLinejoin: "round",
                }}
              >
                {key} · {p.count}
                {dStr && (
                  <tspan fill={deltaColor(p.delta)} fontWeight={600}>
                    {dStr}
                  </tspan>
                )}
              </text>
            </Marker>
          );
        })}
      </ComposableMap>

      <EuropeInset points={europeanPoints} maxCount={maxCount} />
    </div>
  );
}

function EuropeInset({
  points,
  maxCount,
}: {
  points: Point[];
  maxCount: number;
}) {
  // Hidden under md (the inset becomes both unreadable and crowds the global
  // map at narrow widths). On md+ it scales with viewport rather than sitting
  // at a fixed 200px while the global map shrinks.
  return (
    <div
      className="hidden md:block absolute bottom-2 right-2"
      style={{
        width: "clamp(160px, 18vw, 220px)",
        aspectRatio: "1 / 1",
        borderRadius: "50%",
        overflow: "hidden",
        border: "1.5px solid #00A0B0",
        background: "#FFF1E5",
      }}
    >
      <ComposableMap
        projection="geoMercator"
        width={200}
        height={200}
        projectionConfig={{ center: [8, 48], scale: 380 }}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={WORLD_TOPO}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                style={{
                  default: { fill: "#33302E", stroke: "none", outline: "none" },
                  hover:   { fill: "#33302E", stroke: "none", outline: "none" },
                  pressed: { fill: "#33302E", stroke: "none", outline: "none" },
                }}
              />
            ))
          }
        </Geographies>

        {points.map((p) => {
          const r = insetRadius(p.count, maxCount);
          return (
            <Marker key={`inset-${p.name}`} coordinates={[p.lng, p.lat]}>
              <circle
                r={r}
                fill="#00A0B0"
                fillOpacity={0.4}
                stroke="#00A0B0"
                strokeWidth={1.5}
              />
            </Marker>
          );
        })}

        {points.map((p) => {
          const key = labelKey(p.name);
          const off = CITY_LABELS[key]?.inset;
          if (!off) return null;
          const r = insetRadius(p.count, maxCount);
          const dist = Math.sqrt(off.dx * off.dx + off.dy * off.dy) || 1;
          const sx = (off.dx / dist) * (r + 1.5);
          const sy = (off.dy / dist) * (r + 1.5);
          return (
            <Marker
              key={`inset-lbl-${p.name}`}
              coordinates={[p.lng, p.lat]}
            >
              <line
                x1={sx}
                y1={sy}
                x2={off.dx}
                y2={off.dy}
                stroke="#0A3C5A"
                strokeWidth={1}
              />
              <text
                x={off.dx + (off.anchor === "start" ? 3 : off.anchor === "end" ? -3 : 0)}
                y={off.dy + 3}
                fontSize={10}
                fontWeight={500}
                fill="#0A3C5A"
                textAnchor={off.anchor}
                style={{
                  fontFamily: "var(--font-sans)",
                  paintOrder: "stroke",
                  stroke: "#FFF1E5",
                  strokeWidth: 3,
                  strokeLinejoin: "round",
                }}
              >
                {key}
              </text>
            </Marker>
          );
        })}
      </ComposableMap>
    </div>
  );
}
