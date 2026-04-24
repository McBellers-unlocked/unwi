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
}

const WORLD_TOPO = "/maps/countries-110m.json";

// European bounding box — used to pull the cluster out for the circular inset.
const EUROPE_BBOX = { lngMin: -12, lngMax: 30, latMin: 35, latMax: 60 };

// Aurora's geography rows carry "City, Country" ("Geneva, Switzerland"); the
// local seed carries bare "Geneva"; some UNICC rows arrive as "Valencia (Spain)".
// Offset dicts key on the short city form, so normalise before lookup and
// before rendering so labels survive both shapes.
function labelKey(name: string): string {
  const stripped = name.replace(/\(.+?\)/g, "");
  const first = stripped.split(",")[0] ?? stripped;
  return first.trim();
}

const LABEL_OFFSETS: Record<
  string,
  { dx: number; dy: number; anchor: "start" | "middle" | "end" }
> = {
  // The European cluster is unavoidably dense, so labels push well clear
  // of the bubble cloud. A pink halo on the text (paint-order: stroke)
  // keeps labels readable even where they cross dark land.
  Geneva:     { dx: -140, dy: -80, anchor: "end"   },
  Rome:       { dx:   50, dy: 100, anchor: "start" },
  "New York": { dx:  100, dy: -40, anchor: "start" },
  Amman:      { dx:  120, dy:  10, anchor: "start" },
  Nairobi:    { dx:  120, dy:  30, anchor: "start" },
};

// Per-city label offsets for the inset, tuned against the Mercator scale=500
// centred on [8, 48]. Every offset points inward (away from the circle
// edge) so labels land inside the 200px circular clip.
const INSET_LABEL_OFFSETS: Record<
  string,
  { dx: number; dy: number; anchor: "start" | "middle" | "end" }
> = {
  Geneva:     { dx: -22, dy:  14, anchor: "end"    },
  Rome:       { dx: -20, dy:   8, anchor: "end"    },
  Copenhagen: { dx: -16, dy:   6, anchor: "end"    },
  Vienna:     { dx: -20, dy:  -4, anchor: "end"    },
  Bonn:       { dx:  12, dy: -16, anchor: "start"  },
  Paris:      { dx:   0, dy:  16, anchor: "middle" },
  Valencia:   { dx:  16, dy:   4, anchor: "start"  },
};

function radiusFromCount(count: number, maxCount: number): number {
  const minR = 4;
  const maxR = 32;
  if (maxCount <= 0) return minR;
  const ratio = Math.sqrt(count) / Math.sqrt(maxCount);
  return minR + (maxR - minR) * ratio;
}

function insetRadius(count: number, maxCount: number): number {
  // Smaller min/max for the 200px inset so bubbles don't swamp the view.
  const minR = 3;
  const maxR = 10;
  if (maxCount <= 0) return minR;
  const ratio = Math.sqrt(count) / Math.sqrt(maxCount);
  return minR + (maxR - minR) * ratio;
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
    .slice(0, 10); // keep the inset's bubble count bounded

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
          const off = LABEL_OFFSETS[key];
          if (!off) return null;
          const r = radiusFromCount(p.count, maxCount);
          const dist = Math.sqrt(off.dx * off.dx + off.dy * off.dy) || 1;
          const sx = (off.dx / dist) * (r + 2);
          const sy = (off.dy / dist) * (r + 2);
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
  // 200px diameter circle, bottom-right corner. Zoomed Mercator view of
  // Europe — helps the reader see the Geneva > Rome > Vienna hierarchy the
  // global cluster obscures.
  return (
    <div
      className="absolute bottom-2 right-2"
      style={{
        width: 200,
        height: 200,
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
          const off = INSET_LABEL_OFFSETS[key];
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
