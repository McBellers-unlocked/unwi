"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ModuleShell, StatCard } from "@/components/module-shell";
import type { SystemBlock } from "@/lib/compute/types";

export function SystemPulse({
  system,
  ytdAnchor,
}: {
  system: SystemBlock;
  ytdAnchor: string;
}) {
  return (
    <ModuleShell
      id="system-pulse"
      title="1. System Pulse"
      micro={`Snapshot-time view of aggregate UN common-system hiring activity. "YTD" counts postings dated on or after ${ytdAnchor}.`}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          label={`Postings since ${ytdAnchor}`}
          value={system.totalYtdPosts.toLocaleString()}
        />
        <StatCard
          label="Active postings right now"
          value={system.totalActivePosts.toLocaleString()}
        />
        <StatCard
          label="Distinct agencies hiring"
          value={system.distinctAgencies.toLocaleString()}
        />
      </div>
      <div className="panel p-4">
        <p className="text-xs uppercase tracking-wide text-muted mb-3">
          Top 10 agencies by active posting volume
        </p>
        <div style={{ width: "100%", height: 360 }}>
          <ResponsiveContainer>
            <BarChart
              data={system.topAgenciesByVolume}
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
              <Tooltip
                formatter={(v: number, _n, p) => [
                  `${v.toLocaleString()} (${(p.payload as { pctOfSystem: number }).pctOfSystem.toFixed(1)}%)`,
                  "Postings",
                ]}
              />
              <Bar dataKey="count" fill="#009EDB" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ModuleShell>
  );
}
