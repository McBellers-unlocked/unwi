import { SectionShell } from "@/components/section-shell";

const NON_DIGITAL_SEGMENTS = [
  {
    name: "Humanitarian & Emergency Response",
    desc: "Emergency coordination, relief operations, protection.",
  },
  {
    name: "Climate & Environment",
    desc: "Mitigation, adaptation, biodiversity, sustainability.",
  },
  {
    name: "Public Health",
    desc: "Clinical, epidemiology, community health programming.",
  },
  {
    name: "Education",
    desc: "Curriculum, access, pedagogy, teacher development.",
  },
  {
    name: "Social Policy & Protection",
    desc: "Cash transfers, social safety nets, child protection.",
  },
  {
    name: "Legal & Human Rights",
    desc: "International law, advocacy, rights monitoring.",
  },
  {
    name: "Governance & Peacebuilding",
    desc: "Democratic institutions, mediation, rule of law.",
  },
  {
    name: "Finance & Economics",
    desc: "Macro, development finance, audit, budget.",
  },
  {
    name: "Supply Chain & Operations",
    desc: "Procurement, logistics, field operations.",
  },
  {
    name: "HR & Talent",
    desc: "Workforce planning, talent acquisition, diversity.",
  },
];

export function Section10Roadmap() {
  return (
    <SectionShell
      id="section-10"
      number={10}
      title="Coming in Q3 2026: Full UN Workforce Coverage"
      subtitle="Same methodology. Same locked-taxonomy discipline. Parallel classifier in active development."
      variant="navy"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {NON_DIGITAL_SEGMENTS.map((s) => (
          <div
            key={s.name}
            className="border border-teal/40 rounded-md p-4 bg-navy-soft/40"
          >
            <p className="font-serif text-white text-base mb-1">{s.name}</p>
            <p className="text-sm text-teal-soft leading-snug">{s.desc}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-sm text-teal-soft italic leading-relaxed">
        The classifier seam is intentional. A new taxonomy ships as a drop-in
        replacement; data pipeline, Aurora schema, and dashboard shell are
        reused. Non-digital findings will publish under{" "}
        <code className="font-mono text-teal text-xs">
          snapshots/latest/nondigital/
        </code>
        .
      </p>
    </SectionShell>
  );
}
