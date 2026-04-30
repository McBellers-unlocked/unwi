import { getCollisionProfiles } from "@/lib/data";
import { CollisionHeatmap } from "./section-04-heatmap";

export async function Section04Profiles() {
  const collisions = await getCollisionProfiles();
  const profiles = collisions?.profiles ?? [];

  if (profiles.length === 0) {
    return null;
  }

  const sorted = [...profiles].sort(
    (a, b) => b.organisation_count - a.organisation_count,
  );
  const tiles = sorted.slice(0, 5);
  const sixOrMore = sorted.filter((p) => p.organisation_count >= 6).length;

  return (
    <section className="mt-24">
      <div className="mx-auto max-w-column px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          04
        </p>
        <h2 className="mt-4 font-serif text-section text-ink-primary tracking-tight">
          Cross-agency competition for identical role profiles.
        </h2>
        <p className="mt-4 font-serif italic text-standfirst text-ink-muted">
          Which organisations are hiring the same digital profiles in the
          same window. Each row is a canonical role title; each column an
          agency.
        </p>
      </div>

      <div className="mx-auto max-w-wide px-6 mt-10">
        <p className="text-[11px] uppercase tracking-[0.2em] text-highlight font-medium">
          Top collision profiles
        </p>
        <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {tiles.map((p) => (
            <li
              key={`${p.canonical_title}-${p.segment}`}
              className="border border-rule px-4 py-3"
            >
              <div className="flex items-baseline gap-2">
                <span
                  className="numeric font-serif text-ink-primary leading-none"
                  style={{ fontSize: "32px", fontWeight: 600 }}
                >
                  {p.organisation_count}
                </span>
                <span className="text-[11px] uppercase tracking-[0.15em] text-ink-muted">
                  organisations
                </span>
              </div>
              <p className="mt-1 text-[13px] font-medium text-ink-primary leading-snug">
                hiring {p.canonical_title}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-auto max-w-wide px-6 mt-10">
        <p className="text-[12px] text-ink-muted leading-snug">
          Cross-agency competition: breadth of demand for identical role
          profiles. Coloured cell = agency is hiring this profile.
          {profiles[0]?.posting_counts
            ? " Number = postings. Colour caps at 4 for legibility."
            : " A future snapshot will populate per-cell posting counts."}
        </p>
        <div className="mt-4">
          <CollisionHeatmap profiles={sorted} />
        </div>
      </div>

      <div className="mx-auto max-w-wide px-6 mt-10">
        <div className="bg-highlight px-6 py-4 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
          <span className="text-[11px] uppercase tracking-[0.2em] text-white/80 whitespace-nowrap font-medium">
            Decision implication
          </span>
          <span className="font-serif italic text-[15px] text-white leading-snug">
            Where six or more organisations are independently sourcing the
            same profile in the same window, pooled sourcing or shared
            rosters become economically compelling
            {sixOrMore > 0
              ? ` — true today for ${sixOrMore} role profile${
                  sixOrMore === 1 ? "" : "s"
                }.`
              : "."}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-column px-6 mt-6">
        <p className="text-caption text-ink-muted">
          {sorted.length} canonical title
          {sorted.length === 1 ? "" : "s"} reach the three-organisation
          collision threshold in this window. Source: UN Workforce
          Intelligence, Q1 2026 classified dataset.
        </p>
      </div>
    </section>
  );
}
