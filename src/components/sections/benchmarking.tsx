import {
  AGENCY_BREAKDOWN,
  BENCHMARKING_META,
  MARKET_SIGNALS,
  PEER_LADDER,
  RECOMMENDATION,
  SCENARIO_REFERENCE_LINES,
  SCENARIOS,
  UNICC_FUNCTIONS,
} from "@/lib/benchmarking";
import { AgencyBars } from "./benchmarking-agency-bars";
import { FunctionBars } from "./benchmarking-function-bars";
import { PeerLadder } from "./benchmarking-peer-ladder";
import { ScenarioChart } from "./benchmarking-scenario-chart";

export function BenchmarkingView() {
  const sortedAgencies = [...AGENCY_BREAKDOWN].sort((a, b) => b.pct - a.pct);
  const zeroAiFunctions = UNICC_FUNCTIONS.filter((f) => f.aiCore === 0);
  const zeroAiTotal = zeroAiFunctions.reduce((s, f) => s + f.total, 0);
  const libraryTotal = UNICC_FUNCTIONS.reduce((s, f) => s + f.total, 0);
  const zeroAiSharePct = Math.round((zeroAiTotal / libraryTotal) * 100);

  return (
    <div className="pt-2">
      <Lede zeroAiTotal={zeroAiTotal} zeroAiSharePct={zeroAiSharePct} />
      <Section1Ladder />
      <Section2Functions
        zeroAiTotal={zeroAiTotal}
        zeroAiSharePct={zeroAiSharePct}
      />
      <Section3Agencies sorted={sortedAgencies} />
      <Section4Scenarios />
      <Section5MarketSignals />
      <Section6Recommendation />
      <Footnote />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  B0 — Lede                                                                 */
/* -------------------------------------------------------------------------- */

function Lede({
  zeroAiTotal,
  zeroAiSharePct,
}: {
  zeroAiTotal: number;
  zeroAiSharePct: number;
}) {
  const { totalStaffPDs, aiCorePDs, aiCorePct } = BENCHMARKING_META.unicсBaseline;

  return (
    <header className="pt-12">
      <div className="mx-auto max-w-column px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          {BENCHMARKING_META.paperVersion} · {BENCHMARKING_META.paperDate}
        </p>
        <h1 className="mt-4 font-serif text-hero text-ink-primary tracking-tight">
          UNICC has built an AI Centre of Excellence.
          <br />
          The rest of the operating model
          <br />
          has not yet recognised that AI exists.
        </h1>
        <p className="mt-6 font-serif italic text-standfirst text-ink-muted">
          {aiCorePDs} of {totalStaffPDs} UNICC staff PDs ({aiCorePct.toFixed(1)}%)
          qualify as AI-Core under a strict-tier definition. Private-sector ICT
          providers in G7 economies operate at 78%. UNDP and the World Bank sit
          north of 35%.
        </p>
        <div className="mt-8 h-[2px] w-full bg-highlight" />

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <FeatureStat
            value={`${aiCorePct.toFixed(1)}%`}
            label="UNICC PD library, staff"
            tone="claret"
          />
          <FeatureStat value="35.3%" label="UNDP, closest UN peer" />
          <FeatureStat value="78%" label="Private-sector ICT (G7)" tone="highlight" />
        </div>

        <p className="mt-10 font-serif text-[1.25rem] leading-[1.5] text-ink-primary">
          {zeroAiTotal} of UNICC&rsquo;s {totalStaffPDs} staff PDs sit in
          functions with zero AI-Core specifications — {zeroAiSharePct}% of the
          library. The competitive question is not whether private-sector and
          UNDP capability will be available to UN clients. It is whether
          UNICC&rsquo;s documented capability profile reads as a credible
          alternative to either.
        </p>
      </div>
    </header>
  );
}

function FeatureStat({
  value,
  label,
  tone = "anchor",
}: {
  value: string;
  label: string;
  tone?: "anchor" | "highlight" | "claret";
}) {
  const color =
    tone === "claret"
      ? "#990F3D"
      : tone === "highlight"
      ? "#00A0B0"
      : "#0A3C5A";
  return (
    <div className="border-t border-rule pt-3">
      <p
        className="numeric font-serif leading-[0.95] tracking-tight"
        style={{ fontSize: "56px", color, fontWeight: 600 }}
      >
        {value}
      </p>
      <p className="mt-2 text-[12px] uppercase tracking-[0.15em] text-ink-muted">
        {label}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  B1 — Peer ladder                                                          */
/* -------------------------------------------------------------------------- */

function Section1Ladder() {
  return (
    <section className="mt-24">
      <div className="mx-auto max-w-column px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          B1
        </p>
        <h2 className="mt-4 font-serif text-section text-ink-primary tracking-tight">
          The ladder UNICC is being measured against.
        </h2>
        <p className="mt-4 font-serif italic text-standfirst text-ink-muted">
          AI-Core share by cohort. UNICC is below the slowest-moving group in
          the UN system, and an order of magnitude behind UNDP and World Bank.
        </p>

        <div className="mt-10">
          <PeerLadder rows={PEER_LADDER} />
        </div>

        <p className="mt-6 text-caption text-ink-muted">
          UNICC figure is stock (April 2026 PD library). Peer figures are flow
          over the 9-month window August 2025 to April 2026 (n=856 across 47
          UN-system organisations). Private-sector benchmark from the Cisco AI
          Workforce Consortium ICT in Motion 2025 study (G7 economies). The
          asymmetry pulls in UNICC&rsquo;s favour — flow rates over-represent
          recent issuance.
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  B2 — Function-level                                                        */
/* -------------------------------------------------------------------------- */

function Section2Functions({
  zeroAiTotal,
  zeroAiSharePct,
}: {
  zeroAiTotal: number;
  zeroAiSharePct: number;
}) {
  return (
    <section className="mt-24">
      <div className="mx-auto max-w-column px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          B2
        </p>
        <h2 className="mt-4 font-serif text-section text-ink-primary tracking-tight">
          Six of UNICC&rsquo;s nine AI-Core PDs sit in two places.
        </h2>
        <p className="mt-4 font-serif italic text-standfirst text-ink-muted">
          Cybersecurity, Digital Workplace, Enterprise Apps, Network and
          Project Management — collectively {zeroAiTotal} PDs ({zeroAiSharePct}%
          of the library) — contain zero AI-Core specifications.
        </p>

        <div className="mt-10">
          <FunctionBars rows={UNICC_FUNCTIONS} />
        </div>

        <p className="mt-6 text-caption text-ink-muted">
          Each row shows total PDs in the function. The teal slice is AI-Core;
          the rest is everything else. Cybersecurity has zero AI-Core PDs in 97
          documents — despite AI-driven threat detection, automated incident
          response and LLM-assisted threat hunting being defining features of
          cybersecurity practice over the past 18 months.
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  B3 — Agency-level                                                         */
/* -------------------------------------------------------------------------- */

function Section3Agencies({
  sorted,
}: {
  sorted: typeof AGENCY_BREAKDOWN;
}) {
  return (
    <section className="mt-24">
      <div className="mx-auto max-w-column px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          B3
        </p>
        <h2 className="mt-4 font-serif text-section text-ink-primary tracking-tight">
          UNDP at 35% is the closest UN-system peer.
        </h2>
        <p className="mt-4 font-serif italic text-standfirst text-ink-muted">
          Same recruitment frameworks, same procurement constraints, similar
          mandate. The depth of integration — down to entry and intern level — is
          the substantive difference.
        </p>

        <div className="mt-10">
          <AgencyBars rows={sorted} />
        </div>

        <p className="mt-6 text-caption text-ink-muted">
          UNDP&rsquo;s AI-Core postings include &lsquo;AI Innovation
          Intern&rsquo;, &lsquo;Urban Data and AI Specialist&rsquo;, and a global
          call for digital, AI and innovation internships in 2026. World Bank
          Group at 40% demonstrates the achievable ceiling within a multilateral
          framework. Among UNICC&rsquo;s closest organisational analogues — OICT,
          UNRWA IM, IOM, UNCTAD, WHO, WIPO — AI-Core references are absent from
          the window.
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  B4 — Scenarios                                                            */
/* -------------------------------------------------------------------------- */

function Section4Scenarios() {
  return (
    <section className="mt-24">
      <div className="mx-auto max-w-column px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          B4
        </p>
        <h2 className="mt-4 font-serif text-section text-ink-primary tracking-tight">
          Four trajectories. Only one closes the UNDP gap.
        </h2>
        <p className="mt-4 font-serif italic text-standfirst text-ink-muted">
          Convergence scenarios for UNICC&rsquo;s PD library, anchored on peer
          reference points re-measured at the strict tier.
        </p>
      </div>

      <div className="mx-auto max-w-wide px-6 mt-10">
        <ScenarioChart
          scenarios={SCENARIOS}
          referenceLines={[...SCENARIO_REFERENCE_LINES]}
        />
      </div>

      <div className="mx-auto max-w-column px-6 mt-8">
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5 mt-2">
          {SCENARIOS.map((s) => (
            <li
              key={s.id}
              className={
                "border-l-[3px] pl-4 " +
                (s.recommended ? "border-highlight" : "border-rule")
              }
            >
              <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
                Scenario {s.id}
                {s.recommended ? " · Recommended" : ""}
              </p>
              <p className="mt-1 font-serif text-[18px] text-ink-primary leading-tight font-semibold">
                {s.name}
              </p>
              <p className="mt-1 text-[13px] text-ink-body leading-snug">
                {s.detail}
              </p>
              <p className="mt-2 text-[13px] text-ink-muted leading-snug">
                Year 1: <span className="numeric text-ink-primary">{s.year1.toFixed(1)}%</span>{" "}
                · Year 5: <span className="numeric text-ink-primary">{s.year5.toFixed(1)}%</span>
              </p>
              <p className="mt-1 text-[13px] font-medium text-ink-primary leading-snug">
                Reaches: {s.reaches}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  B5 — Market signals                                                       */
/* -------------------------------------------------------------------------- */

function Section5MarketSignals() {
  return (
    <section className="mt-24">
      <div className="mx-auto max-w-column px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          B5
        </p>
        <h2 className="mt-4 font-serif text-section text-ink-primary tracking-tight">
          The pace the UN system is being measured against.
        </h2>
        <p className="mt-4 font-serif italic text-standfirst text-ink-muted">
          Five external data points. AI integration into role specifications is
          standard practice in G7 ICT, growing at double-digit rates per year.
        </p>

        <ul className="mt-10 divide-y divide-rule border-t border-b border-rule">
          {MARKET_SIGNALS.map((s) => (
            <li
              key={s.source}
              className="grid grid-cols-[1fr] md:grid-cols-[260px_1fr] gap-2 md:gap-8 py-5"
            >
              <div>
                <p className="font-serif text-[16px] text-ink-primary font-semibold leading-tight">
                  {s.source}
                </p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-ink-muted mt-1">
                  {s.year}
                </p>
              </div>
              <p className="text-[14px] text-ink-body leading-snug">
                {s.figure}
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-caption text-ink-muted">
          UN clients have access to private-sector AI-augmented IT services
          today through commercial procurement, from providers whose role
          specifications already reflect AI as the default. Peer figures are
          themselves moving — the convergence model treats them as static
          reference lines for clarity; the strategic implication is that
          UNICC&rsquo;s required pace is at least as fast as the trajectories
          shown.
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  B6 — Recommendation                                                        */
/* -------------------------------------------------------------------------- */

function Section6Recommendation() {
  return (
    <section className="mt-24">
      <div className="mx-auto max-w-column px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          B6 · Recommendation
        </p>
        <h2 className="mt-4 font-serif text-section text-ink-primary tracking-tight">
          {RECOMMENDATION.title}
        </h2>
        <p className="mt-4 font-serif italic text-standfirst text-ink-muted">
          Scenario {RECOMMENDATION.scenario}.
        </p>

        <p className="mt-6 font-serif text-[1.125rem] leading-[1.55] text-ink-primary">
          {RECOMMENDATION.summary}
        </p>

        <dl className="mt-10 space-y-6 border-t border-rule pt-6">
          {RECOMMENDATION.rows.map((row) => (
            <div
              key={row.term}
              className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-2 md:gap-8"
            >
              <dt className="text-[11px] uppercase tracking-[0.18em] text-ink-muted pt-1">
                {row.term}
              </dt>
              <dd className="text-[14px] text-ink-body leading-relaxed">
                {row.detail}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Footnote                                                                  */
/* -------------------------------------------------------------------------- */

function Footnote() {
  return (
    <section className="mt-20 mb-8">
      <div className="mx-auto max-w-column px-6">
        <p className="font-serif italic text-[13px] text-ink-muted leading-snug">
          {BENCHMARKING_META.paperTitle}, {BENCHMARKING_META.paperVersion} (
          {BENCHMARKING_META.paperDate}). {BENCHMARKING_META.windowDescription}{" "}
          A flow-versus-flow comparison using UNICC&rsquo;s recent JVN data is
          the recommended next step. Quarterly refresh: edit{" "}
          <code className="text-[12px]">src/lib/benchmarking.ts</code>.
        </p>
      </div>
    </section>
  );
}
