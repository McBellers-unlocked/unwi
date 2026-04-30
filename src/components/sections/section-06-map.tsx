import { promises as fs } from "fs";
import path from "path";
import {
  getGeography,
  getSnapshotMeta,
  type GeographyTrend,
} from "@/lib/data";
import { getPeriodCopy, type WindowKey } from "@/lib/window";
import { WorldMap } from "./section-06-worldmap";

interface Station {
  lat: number;
  lng: number;
  country: string;
}

async function loadStations(): Promise<Record<string, Station>> {
  try {
    const p = path.join(process.cwd(), "public", "duty_stations.json");
    const raw = await fs.readFile(p, "utf-8");
    return JSON.parse(raw) as Record<string, Station>;
  } catch {
    return {};
  }
}

function normaliseKey(loc: string): string {
  const cleaned = loc.toLowerCase().replace(/\(.+?\)/g, "");
  const first = cleaned.split(",")[0] ?? cleaned;
  return first.trim();
}

export async function Section06Map({
  trend,
  window = "q1",
}: {
  trend?: GeographyTrend | null;
  window?: WindowKey;
}) {
  const [geo, stations, meta] = await Promise.all([
    trend?.end ? Promise.resolve(trend.end) : getGeography(),
    loadStations(),
    getSnapshotMeta(),
  ]);
  const copy = getPeriodCopy(window);

  const points = geo
    .map((g) => {
      const s = stations[normaliseKey(g.locationOrCountry)];
      if (!s) return null;
      return {
        name: g.locationOrCountry,
        lat: s.lat,
        lng: s.lng,
        count: g.count,
        delta: trend?.deltas[g.locationOrCountry]?.delta,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => b.count - a.count);

  const top5 = points.slice(0, 5);
  const top5Share = top5.reduce((s, p) => s + p.count, 0);
  // Denominator is the full digital-postings count from the snapshot, not the
  // sum of location-tagged rows — a share-of-hiring claim reads against the
  // headline digital total, not the subset we could geocode.
  const digitalTotal = meta?.digitalPostings ?? 0;
  const top5Pct =
    digitalTotal > 0 ? Math.round((top5Share / digitalTotal) * 100) : 0;

  return (
    <section className="mt-24">
      <div className="mx-auto max-w-column px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          06
        </p>
        <h2 className="mt-4 font-serif text-section text-ink-primary tracking-tight">
          Digital hiring concentrates in five HQ cities.
        </h2>
        <p className="mt-4 font-serif italic text-standfirst text-ink-muted">
          Geneva alone accounts for more digital roles than any three field
          duty stations combined.
        </p>
      </div>

      <div className="mx-auto max-w-wide px-6 mt-8">
        <WorldMap points={points} />
      </div>

      <div className="mx-auto max-w-column px-6 mt-4">
        <p className="text-caption text-ink-muted">
          Five cities hold {top5Pct}% {copy.mapHeadline}. The concentration
          reflects HQ-centric workforce structure — but creates local labour
          market collision when multiple agencies recruit simultaneously in
          the same city. Source: {copy.mapSource}.
        </p>
      </div>
    </section>
  );
}
