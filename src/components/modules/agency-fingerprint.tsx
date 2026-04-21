"use client";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { ModuleShell, StatCard } from "@/components/module-shell";
import type { AgencyFingerprint } from "@/lib/compute/types";

function median(xs: Array<number | null | undefined>): number | null {
  const arr = xs.filter((x): x is number => typeof x === "number");
  if (arr.length === 0) return null;
  arr.sort((a, b) => a - b);
  const m = Math.floor(arr.length / 2);
  return arr.length % 2 === 0
    ? Math.round((arr[m - 1]! + arr[m]!) / 2)
    : arr[m]!;
}

function Delta({ value, unit = "" }: { value: number; unit?: string }) {
  const positive = value > 0;
  return (
    <span className={positive ? "text-un-blue" : "text-red-600"}>
      {positive ? "+" : ""}
      {value.toFixed(1)}
      {unit}
    </span>
  );
}

export function AgencyFingerprint({
  agencies,
}: {
  agencies: AgencyFingerprint[];
}) {
  const defaultOrg =
    agencies.find((a) => a.organization.toLowerCase().includes("unicc"))
      ?.organization ??
    agencies[0]?.organization ??
    "";
  const [selected, setSelected] = useState(defaultOrg);
  const agency = agencies.find((a) => a.organization === selected);

  const systemMedianTtc = useMemo(
    () => median(agencies.map((a) => a.medianTimeToCloseDays)),
    [agencies],
  );
  const systemMedianRepost = useMemo(
    () => median(agencies.map((a) => a.repostingRatePct)),
    [agencies],
  );
  const systemMedianConsultant = useMemo(
    () => median(agencies.map((a) => a.consultantRatioPct)),
    [agencies],
  );

  if (!agency) {
    return (
      <ModuleShell id="agency-fingerprint" title="5. Agency Fingerprint">
        <p className="text-sm text-muted">No agency data yet.</p>
      </ModuleShell>
    );
  }

  const gradeMix = [
    { bucket: "P-level", n: agency.pLevelPosts },
    {
      bucket: "Other",
      n: Math.max(0, agency.totalActivePosts - agency.pLevelPosts),
    },
  ];
  const geoMix = [
    { name: "HQ", value: agency.hqPosts },
    { name: "Field", value: agency.fieldPosts },
  ];

  return (
    <ModuleShell
      id="agency-fingerprint"
      title="5. Agency Fingerprint"
      micro="Six panels compared against system median across all UN agencies. Deltas in red/blue show where this agency deviates."
    >
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm text-muted">Agency</label>
        <select
          className="border border-panel-line rounded px-3 py-1.5 text-sm bg-white"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {agencies.map((a) => (
            <option key={a.organization} value={a.organization}>
              {a.organization}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted mb-3">
            Grade mix
          </p>
          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer>
              <BarChart data={gradeMix}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="bucket" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="n" fill="#009EDB" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel p-4">
          <p className="text-xs uppercase tracking-wide text-muted mb-3">
            Geographic decentralisation (P-level)
          </p>
          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie dataKey="value" data={geoMix} innerRadius={40} outerRadius={70}>
                  <Cell fill="#009EDB" />
                  <Cell fill="#94a3b8" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <StatCard
          label="Total active posts"
          value={agency.totalActivePosts}
        />
        <StatCard
          label="Median time-to-close (days)"
          value={agency.medianTimeToCloseDays ?? "—"}
          sub={
            systemMedianTtc != null && agency.medianTimeToCloseDays != null ? (
              <>
                vs system median {systemMedianTtc} ·{" "}
                <Delta
                  value={agency.medianTimeToCloseDays - systemMedianTtc}
                  unit="d"
                />
              </>
            ) : null
          }
        />
        <StatCard
          label="Re-posting rate (90d)"
          value={
            agency.repostingRatePct != null
              ? `${agency.repostingRatePct.toFixed(1)}%`
              : "—"
          }
          sub={
            systemMedianRepost != null && agency.repostingRatePct != null ? (
              <>
                vs median {systemMedianRepost.toFixed(1)}% ·{" "}
                <Delta
                  value={agency.repostingRatePct - systemMedianRepost}
                  unit="pp"
                />
              </>
            ) : null
          }
        />
        <StatCard
          label="Consultant ratio"
          value={
            agency.consultantRatioPct != null
              ? `${agency.consultantRatioPct.toFixed(1)}%`
              : "—"
          }
          sub={
            systemMedianConsultant != null &&
            agency.consultantRatioPct != null ? (
              <>
                vs median {systemMedianConsultant.toFixed(1)}% ·{" "}
                <Delta
                  value={agency.consultantRatioPct - systemMedianConsultant}
                  unit="pp"
                />
              </>
            ) : null
          }
        />
      </div>

      <div className="panel p-4 mt-6">
        <p className="text-xs uppercase tracking-wide text-muted mb-3">
          Top 5 demanded skill clusters
        </p>
        <ul className="space-y-2 text-sm">
          {agency.topSkillClusters.map((c) => (
            <li
              key={c.cluster}
              className="flex items-center justify-between border-b border-panel-line py-2"
            >
              <span>{c.cluster}</span>
              <span className="text-muted">{c.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </ModuleShell>
  );
}
