"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { ModuleShell } from "@/components/module-shell";
import type { SkillsBlock } from "@/lib/compute/types";

export function SkillsHeatmap({ data }: { data: SkillsBlock }) {
  // Pivot monthly series into a row-per-month, column-per-cluster shape for Recharts.
  const months = Array.from(new Set(data.monthly.map((r) => r.month))).sort();
  const clusters = Array.from(new Set(data.monthly.map((r) => r.cluster)));
  const pivot = months.map((m) => {
    const row: Record<string, string | number> = { month: m };
    for (const c of clusters) {
      const hit = data.monthly.find((r) => r.month === m && r.cluster === c);
      row[c] = hit?.count ?? 0;
    }
    return row;
  });
  const palette = [
    "#009EDB",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#6366f1",
    "#ec4899",
    "#14b8a6",
    "#f97316",
    "#8b5cf6",
    "#64748b",
  ];
  return (
    <ModuleShell
      id="skills-heatmap"
      title="4. Skills Heatmap"
      micro="Keyword-based cluster tagging on title + description. Phase 2: swap for embedding-based classifier. Cluster names are stable across versions so the chart legend doesn't churn."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted mb-3">
            Skill clusters — last 90 days
          </p>
          <div style={{ width: "100%", height: 360 }}>
            <ResponsiveContainer>
              <BarChart
                data={data.byCluster90d}
                layout="vertical"
                margin={{ left: 100, right: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis type="number" fontSize={11} />
                <YAxis
                  dataKey="cluster"
                  type="category"
                  width={200}
                  fontSize={11}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#009EDB" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted mb-3">
            Top 3 growing clusters (% change over window)
          </p>
          <ul className="space-y-2 mt-2">
            {data.topGrowingClusters.map((c) => (
              <li
                key={c.cluster}
                className="flex items-center justify-between border-b border-panel-line py-2 text-sm"
              >
                <span>{c.cluster}</span>
                <span className={c.pctChange >= 0 ? "text-un-blue" : "text-red-600"}>
                  {c.pctChange >= 0 ? "+" : ""}
                  {c.pctChange.toFixed(1)}%
                  <span className="text-muted text-xs ml-2">
                    {c.startCount} → {c.endCount}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="panel p-4">
        <p className="text-xs uppercase tracking-wide text-muted mb-3">
          Monthly demand per cluster
        </p>
        <div style={{ width: "100%", height: 380 }}>
          <ResponsiveContainer>
            <LineChart data={pivot}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              {clusters.map((c, i) => (
                <Line
                  key={c}
                  type="monotone"
                  dataKey={c}
                  stroke={palette[i % palette.length]}
                  strokeWidth={1.5}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ModuleShell>
  );
}
