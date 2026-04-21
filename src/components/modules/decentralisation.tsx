"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ModuleShell } from "@/components/module-shell";
import type { DecentralisationBlock } from "@/lib/compute/types";

export function Decentralisation({
  data,
}: {
  data: DecentralisationBlock;
}) {
  // Limit stacked bar to top 15 agencies by P-level volume for readability.
  const chartData = data.byAgency.slice(0, 15).map((r) => ({
    organization: r.organization,
    hq: Math.round((r.hqPct / 100) * r.totalPLevel),
    field: Math.round((r.fieldPct / 100) * r.totalPLevel),
    hqPct: r.hqPct,
    fieldPct: r.fieldPct,
    total: r.totalPLevel,
  }));
  return (
    <ModuleShell
      id="decentralisation"
      title="2. Decentralisation Tracker"
      micro="HQ cluster = New York, Geneva, Vienna, Rome, Nairobi, Copenhagen. The heart of Delivering-As-One reform is where P-level hiring actually happens, not where policy says it should."
    >
      <div className="panel p-4 mb-6">
        <p className="text-xs uppercase tracking-wide text-muted mb-3">
          Top 15 agencies by P-level volume — HQ vs field
        </p>
        <div style={{ width: "100%", height: 400 }}>
          <ResponsiveContainer>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 120, right: 24 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis type="number" fontSize={11} />
              <YAxis
                dataKey="organization"
                type="category"
                width={220}
                fontSize={11}
              />
              <Tooltip />
              <Legend />
              <Bar dataKey="hq" stackId="p" name="HQ" fill="#009EDB" />
              <Bar dataKey="field" stackId="p" name="Field" fill="#94a3b8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted mb-3">
            Ranked: agencies ≥20 P-posts, by HQ-concentration %
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted text-xs uppercase tracking-wide">
                  <th className="py-2">Agency</th>
                  <th className="py-2 text-right">Total P-posts</th>
                  <th className="py-2 text-right">HQ %</th>
                  <th className="py-2 text-right">Field %</th>
                </tr>
              </thead>
              <tbody>
                {data.rankedTable.map((r) => (
                  <tr key={r.organization} className="border-t border-panel-line">
                    <td className="py-2">{r.organization}</td>
                    <td className="py-2 text-right">{r.totalPLevel}</td>
                    <td className="py-2 text-right">{r.hqPct.toFixed(1)}</td>
                    <td className="py-2 text-right">{r.fieldPct.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted mb-3">
            Top 10 duty stations — cross-agency competition hotspots
          </p>
          <ul className="space-y-2 text-sm">
            {data.topDutyStations.map((s) => (
              <li
                key={s.location}
                className="flex items-center justify-between border-b border-panel-line py-2"
              >
                <span className="truncate pr-4">{s.location}</span>
                <span className="text-muted shrink-0">
                  {s.concurrentPostings} posts · {s.agencies} agencies
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ModuleShell>
  );
}
