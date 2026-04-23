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

function radiusFromCount(count: number, maxCount: number): number {
  const minR = 4;
  const maxR = 32;
  if (maxCount <= 0) return minR;
  const ratio = Math.sqrt(count) / Math.sqrt(maxCount);
  return minR + (maxR - minR) * ratio;
}

export function WorldMap({ points }: { points: Point[] }) {
  const maxCount = Math.max(1, ...points.map((p) => p.count));

  return (
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
        const off = LABEL_OFFSETS[p.name];
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
              {p.name} · {p.count}
            </text>
          </Marker>
        );
      })}
    </ComposableMap>
  );
}
