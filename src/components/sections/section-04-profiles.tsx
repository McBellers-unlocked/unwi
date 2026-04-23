import { getCollisionProfiles, SEGMENT_LABELS } from "@/lib/data";

export async function Section04Profiles() {
  const collisions = await getCollisionProfiles();
  const profiles = collisions?.profiles ?? [];

  const sorted = [...profiles].sort(
    (a, b) => b.organisation_count - a.organisation_count,
  );
  const [feature, ...rest] = sorted;

  if (!feature) return null;

  return (
    <section className="mt-24">
      <div className="mx-auto max-w-column px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          04
        </p>
        <h2 className="mt-4 font-serif text-section text-ink-primary tracking-tight">
          Six agencies. Same job title. No coordination.
        </h2>
        <p className="mt-4 font-serif italic text-standfirst text-ink-muted">
          Cases where three or more UN agencies are independently recruiting
          for the same normalised title in the same quarter.
        </p>

        <div className="mt-12 flex items-center gap-10">
          <span
            className="numeric font-serif text-ink-primary leading-[0.9]"
            style={{ fontSize: "160px", fontWeight: 400 }}
          >
            {feature.organisation_count}
          </span>
          <div className="flex-1">
            <p className="text-[17px] text-ink-muted leading-snug">
              organisations independently hiring
            </p>
            <p className="mt-1 font-serif text-[30px] text-ink-primary leading-tight">
              {feature.canonical_title}
            </p>
            <p className="mt-1 text-[15px] text-ink-muted">in Q1 2026</p>
          </div>
        </div>

        <p className="mt-6 text-[14px] text-ink-body">
          {feature.organisations.join(" · ")}
        </p>

        {rest.length > 0 && (
          <div className="mt-14">
            <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
              Other collision profiles
            </p>
            <ul className="mt-4">
              {rest.map((p) => (
                <li
                  key={p.canonical_title}
                  className="grid grid-cols-[140px_220px_1fr] gap-6 py-3 border-t border-rule items-baseline"
                >
                  <span className="numeric text-[14px] text-ink-primary font-medium">
                    {p.organisation_count} organisations
                  </span>
                  <span className="text-[14px] text-ink-primary">
                    {p.canonical_title}
                  </span>
                  <span className="text-[14px] text-ink-muted">
                    {p.organisations.join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-8 text-caption text-ink-muted">
          {sorted.length} role profile{sorted.length === 1 ? "" : "s"} are
          being sourced by three or more UN agencies in the same quarter.
          Pooled recruitment or shared rosters would eliminate duplicated
          search effort.{" "}
          {SEGMENT_LABELS[feature.segment as keyof typeof SEGMENT_LABELS]
            ? ""
            : ""}
        </p>
      </div>
    </section>
  );
}
