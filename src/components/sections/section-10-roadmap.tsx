const NON_DIGITAL_SEGMENTS = [
  "Humanitarian & Emergency Response",
  "Climate & Environment",
  "Public Health",
  "Education",
  "Social Policy & Protection",
  "Legal & Human Rights",
  "Governance & Peacebuilding",
  "Finance & Economics",
  "Supply Chain & Operations",
  "HR & Talent",
];

export function Section10Roadmap() {
  return (
    <section className="mt-24">
      <div className="mx-auto max-w-column px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          10
        </p>
        <h2 className="mt-4 font-serif text-section text-ink-primary tracking-tight">
          Coming Q3 2026
        </h2>
        <p className="mt-4 font-serif italic text-standfirst text-ink-muted">
          Full UN workforce coverage, same methodology, same classifier
          discipline.
        </p>

        <ul className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
          {NON_DIGITAL_SEGMENTS.map((s) => (
            <li key={s} className="flex items-baseline gap-3">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-highlight shrink-0 translate-y-[6px]" />
              <span className="font-serif text-[17px] text-ink-primary leading-snug">
                {s}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
