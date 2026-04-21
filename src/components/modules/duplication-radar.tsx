"use client";
import { Fragment, useState } from "react";
import { ModuleShell, StatCard } from "@/components/module-shell";
import type { DuplicationBlock } from "@/lib/compute/types";

export function DuplicationRadar({ data }: { data: DuplicationBlock }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const { usdPerRecruitment, usdToEurRate, windowDays, anchorDate } =
    data.methodology;
  return (
    <ModuleShell
      id="duplication-radar"
      title="3. Duplication Radar"
      micro={`USD ${usdPerRecruitment.toLocaleString()} per recruitment is a conservative midpoint between SHRM standard cost-per-hire (USD 4,700) and executive benchmark (USD 28,329), reflecting international P-level search complexity. JIU-specific figure to be finalised.`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <StatCard
          label={`Duplication events since ${anchorDate}`}
          value={data.eventsCount.toLocaleString()}
          sub={`window: ${windowDays} days · normalised-title, cross-agency`}
        />
        <StatCard
          label="Estimated avoidable cost"
          value={`€${Math.round(data.costEur).toLocaleString()}`}
          sub={`= ${data.eventsCount} × USD ${usdPerRecruitment.toLocaleString()} × ${usdToEurRate}`}
        />
      </div>
      <div className="panel p-4">
        <p className="text-xs uppercase tracking-wide text-muted mb-3">
          Top 20 current duplicated roles
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted text-xs uppercase tracking-wide">
                <th className="py-2">Normalised title</th>
                <th className="py-2">Agencies</th>
                <th className="py-2 text-right">Postings</th>
                <th className="py-2">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {data.topExamples.map((e, i) => (
                <Fragment key={e.normalizedTitle}>
                  <tr className="border-t border-panel-line align-top">
                    <td className="py-2 pr-4">{e.normalizedTitle}</td>
                    <td className="py-2 pr-4 text-muted">
                      {e.agencies.slice(0, 3).join(", ")}
                      {e.agencies.length > 3
                        ? ` +${e.agencies.length - 3}`
                        : ""}
                    </td>
                    <td className="py-2 text-right">{e.count}</td>
                    <td className="py-2 text-right">
                      <button
                        className="text-xs text-un-blue hover:underline"
                        onClick={() => setExpanded(expanded === i ? null : i)}
                      >
                        {expanded === i ? "hide" : "details"}
                      </button>
                    </td>
                  </tr>
                  {expanded === i ? (
                    <tr className="bg-muted-soft">
                      <td colSpan={4} className="py-3 px-4 text-xs text-muted">
                        <div>
                          <strong>Agencies:</strong> {e.agencies.join(", ")}
                        </div>
                        <div className="mt-1">
                          <strong>Posted dates:</strong> {e.dates.join(", ")}
                        </div>
                        <div className="mt-1">
                          <strong>Locations:</strong>{" "}
                          {e.locations.join(", ") || "—"}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ModuleShell>
  );
}
