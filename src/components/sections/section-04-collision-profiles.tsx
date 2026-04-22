import { DecisionBar, SectionShell } from "@/components/section-shell";
import { getCollisionProfiles, SEGMENT_LABELS } from "@/lib/data";

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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {top.map((p) => (
            <div
              key={p.canonical_title}
              className="panel p-5 flex flex-col gap-2"
            >
              <span className="font-serif text-4xl text-navy leading-none">
                {p.organisation_count}
              </span>
              <p className="text-xs uppercase tracking-wide text-teal font-semibold">
                organisations
              </p>
              <p className="text-sm text-navy leading-snug">
                hiring {p.canonical_title}
              </p>
              <p className="text-xs text-muted mt-1">
                {SEGMENT_LABELS[p.segment as keyof typeof SEGMENT_LABELS] ??
                  p.segment}
              </p>
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
