import { DecisionBar, SectionShell } from "@/components/section-shell";
import { getCollisionProfiles, SEGMENT_LABELS } from "@/lib/data";

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function shorten(org: string): string {
  const m: Record<string, string> = {
    "World Food Programme (WFP)": "WFP",
    "United Nations Environment Programme": "UNEP",
    "United Nations Office for Project Services (UNOPS)": "UNOPS",
    "United Nations Office for Disaster Risk Reduction": "UNDRR",
    "United Nations Joint Staff Pension Fund - Pension Administration": "UNJSPF",
    "World Intellectual Property Organization": "WIPO",
    "Department of Economic and Social Affairs": "UN DESA",
    "Department for General Assembly and Conference Management": "UN DGACM",
    "Office of Counter-Terrorism": "UN OCT",
    "United Nations Assistance Mission in Afghanistan": "UNAMA",
    "United Nations Conference on Trade and Development": "UNCTAD",
    "United Nations Office at Nairobi": "UNON",
    "Convention to Combat Desertification": "UNCCD",
    "International Trade Centre": "ITC",
    "Record Management and Quality Control Unit": "RMQCU",
    "Resident Coordinator System": "RC System",
  };
  return m[org] ?? org;
}

export async function Section04CollisionProfiles() {
  const profiles = await getCollisionProfiles();
  const top = profiles?.profiles.slice(0, 5) ?? [];

  return (
    <SectionShell
      id="section-4"
      number={4}
      title="Breadth of Demand for Identical Role Profiles"
      subtitle="Roles where three or more organisations are independently sourcing the same normalised title in Q1 2026."
    >
      {top.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {top.map((p) => (
            <div
              key={p.canonical_title}
              className="panel p-5 flex flex-col gap-2 min-h-[220px]"
            >
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-4xl text-navy leading-none">
                  {p.organisation_count}
                </span>
                <span className="text-xs uppercase tracking-wide text-teal font-semibold">
                  organisations
                </span>
              </div>
              <p className="text-sm text-navy leading-snug font-medium">
                hiring {titleCase(p.canonical_title)}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-muted mt-1">
                {SEGMENT_LABELS[p.segment as keyof typeof SEGMENT_LABELS] ??
                  p.segment}
              </p>
              <ul className="text-xs text-navy/80 leading-relaxed mt-2 border-t border-panel-line pt-2 space-y-0.5">
                {p.organisations.map((org) => (
                  <li key={org} title={org} className="truncate">
                    · {shorten(org)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">No collision profiles detected.</p>
      )}
      <DecisionBar>
        Where six or more organisations are independently sourcing the same
        profile in the same window, pooled sourcing or shared rosters become
        economically compelling.
      </DecisionBar>
    </SectionShell>
  );
}
