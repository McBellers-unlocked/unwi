import { promises as fs } from "fs";
import path from "path";
import { DecisionBar, SectionShell } from "@/components/section-shell";
import { getGeography } from "@/lib/data";
import { DutyStationMaps } from "./section-06-map";

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

export async function Section06Geography() {
  const [geo, stations] = await Promise.all([getGeography(), loadStations()]);

  const rows = geo.map((g) => ({
    locationOrCountry: g.locationOrCountry,
    count: g.count,
    orgs: g.organisationCount,
    topSegments: g.topSegments,
  }));

  const totalDigital = geo.reduce((acc, g) => acc + g.count, 0);
  const top5Share = geo.slice(0, 5).reduce((acc, g) => acc + g.count, 0);
  const concentration =
    totalDigital > 0 ? (top5Share / totalDigital) * 100 : 0;

  return (
    <SectionShell
      id="section-6"
      number={6}
      title="Geographic Concentration"
      subtitle="Top duty stations for digital hiring in Q1 2026. Bubble size = role count; colour intensity = distinct organisations."
      takeaway={
        <>
          <p>
            Top 5 duty stations account for{" "}
            <strong>{concentration.toFixed(0)}%</strong> of digital roles —
            HQ-centric hiring remains the structural baseline.
          </p>
          <p>
            Field capitals (Nairobi, Amman, Manila, Bangkok) carry the
            decentralised minority.
          </p>
        </>
      }
    >
      <DutyStationMaps rows={rows} stations={stations} />
      <DecisionBar>
        Geneva, New York, Nairobi and Amman carry structural collision
        risk: multiple organisations drawing from the same finite local
        labour pool in the same window. Location diversification, remote
        mandates, or coordinated posting calendars reduce internal
        competition.
      </DecisionBar>
    </SectionShell>
  );
}
