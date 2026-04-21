"use client";
import { useMemo, useState } from "react";
import { ModuleShell } from "@/components/module-shell";
import type { ForwardSignalBlock } from "@/lib/compute/types";

type SortKey = "closingDate" | "title" | "organization" | "cluster";

export function ForwardSignal({ data }: { data: ForwardSignalBlock }) {
  const [bucket, setBucket] = useState<"30" | "60">("60");
  const [clusterFilter, setClusterFilter] = useState<string>("");
  const [sort, setSort] = useState<SortKey>("closingDate");
  const source = bucket === "30" ? data.within30d : data.within60d;

  const clusters = useMemo(
    () => Array.from(new Set(source.map((r) => r.cluster))).sort(),
    [source],
  );

  const filtered = useMemo(() => {
    const f = clusterFilter ? source.filter((r) => r.cluster === clusterFilter) : source;
    return [...f].sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      return av < bv ? -1 : av > bv ? 1 : 0;
    });
  }, [source, clusterFilter, sort]);

  return (
    <ModuleShell
      id="forward-signal"
      title="7. Forward Signal"
      headline={
        <span className="text-ink font-medium">{data.headline}</span>
      }
      micro="Closing-date buckets of 30 and 60 days ahead. Filter by cluster; sort by any column. One row = one live posting."
    >
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="inline-flex rounded-md overflow-hidden border border-panel-line">
          {(["30", "60"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBucket(b)}
              className={`px-3 py-1.5 text-sm ${
                bucket === b
                  ? "bg-un-blue text-white"
                  : "bg-white text-muted hover:text-ink"
              }`}
            >
              Next {b}d
            </button>
          ))}
        </div>
        <select
          className="border border-panel-line rounded px-3 py-1.5 text-sm bg-white"
          value={clusterFilter}
          onChange={(e) => setClusterFilter(e.target.value)}
        >
          <option value="">All clusters</option>
          {clusters.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted ml-auto">
          {filtered.length} roles
        </span>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted text-xs uppercase tracking-wide bg-muted-soft">
              <Th k="title" active={sort} onClick={setSort}>
                Title
              </Th>
              <Th k="organization" active={sort} onClick={setSort}>
                Agency
              </Th>
              <th className="py-2 px-3">Location</th>
              <Th k="closingDate" active={sort} onClick={setSort}>
                Closes
              </Th>
              <Th k="cluster" active={sort} onClick={setSort}>
                Cluster
              </Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-panel-line">
                <td className="py-2 px-3">{r.title}</td>
                <td className="py-2 px-3 text-muted">{r.organization}</td>
                <td className="py-2 px-3 text-muted">{r.location}</td>
                <td className="py-2 px-3">{r.closingDate}</td>
                <td className="py-2 px-3 text-muted">{r.cluster}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModuleShell>
  );
}

function Th({
  k,
  active,
  onClick,
  children,
}: {
  k: SortKey;
  active: SortKey;
  onClick: (k: SortKey) => void;
  children: React.ReactNode;
}) {
  return (
    <th
      className={`py-2 px-3 cursor-pointer ${active === k ? "text-ink" : ""}`}
      onClick={() => onClick(k)}
    >
      {children} {active === k ? "↑" : ""}
    </th>
  );
}
