"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ModuleShell, StatCard } from "@/components/module-shell";
import type { DigitalTalentBlock } from "@/lib/compute/types";

const SUB_CLUSTER_COLORS: Record<string, string> = {
  "AI / Machine Learning": "#009EDB",
  "Data & Analytics": "#6366f1",
  "Cyber & Security": "#ef4444",
  "Cloud & Infrastructure": "#10b981",
  "Digital Policy & Governance": "#f59e0b",
};

export function DigitalTalent({ data }: { data: DigitalTalentBlock }) {
  // Pivot monthlyBySubCluster into month x cluster rows for stacked area.
  const months = Array.from(
    new Set(data.monthlyBySubCluster.map((r) => r.month)),
  ).sort();
  const clusters = Array.from(
    new Set(data.monthlyBySubCluster.map((r) => r.cluster)),
  );
  const pivot = months.map((m) => {
    const row: Record<string, string | number> = { month: m };
    for (const c of clusters) {
      const hit = data.monthlyBySubCluster.find(
        (r) => r.month === m && r.cluster === c,
      );
      row[c] = hit?.count ?? 0;
    }
    return row;
  });

  return (
    <ModuleShell
      id="digital-talent"
      title="6. Digital Talent"
      headline={
        <span className="text-ink font-medium">{data.headline}</span>
      }
      micro="Digital = AI/ML + Data & Analytics + Cyber & Security + Cloud & Infrastructure + Digital Policy. Duplication counter uses the same method as Module 3, filtered to digital-cluster roles only."
    >
      <div className="panel p-4 mb-6">
        <p className="text-xs uppercase tracking-wide text-muted mb-3">
          Monthly digital role volume by sub-cluster
        </p>
        <div style={{ width: "100%", height: 380 }}>
          <ResponsiveContainer>
            <AreaChart data={pivot}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              {clusters.map((c) => (
                <Area
                  key={c}
                  type="monotone"
                  dataKey={c}
                  stackId="d"
                  stroke={SUB_CLUSTER_COLORS[c] ?? "#94a3b8"}
                  fill={SUB_CLUSTER_COLORS[c] ?? "#94a3b8"}
                  fillOpacity={0.65}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted mb-3">
            Top 10 agencies hiring digital talent
          </p>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart
                data={data.topAgencies}
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
                <Bar dataKey="count" fill="#009EDB" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-rows-2 gap-6">
          <StatCard
            label="Concurrent digital duplication"
            value={data.concurrentDuplication.eventsCount.toLocaleString()}
            sub={`Estimated avoidable cost: €${Math.round(
              data.concurrentDuplication.costEur,
            ).toLocaleString()}`}
          />
          <div className="panel p-4">
            <p className="text-xs uppercase tracking-wide text-muted mb-3">
              Top 10 duty stations for digital roles
            </p>
            <ul className="space-y-1 text-sm">
              {data.concurrentDuplication.topDutyStations.map((s) => (
                <li
                  key={s.location}
                  className="flex justify-between border-b border-panel-line py-1"
                >
                  <span className="truncate pr-4">{s.location}</span>
                  <span className="text-muted">{s.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </ModuleShell>
  );
}
