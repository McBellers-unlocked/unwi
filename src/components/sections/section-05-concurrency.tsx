import { getConcurrencyTimeseries } from "@/lib/data";
import { ConcurrencyChart } from "./section-05-chart";

export async function Section05Concurrency() {
  const ts = await getConcurrencyTimeseries();
  const segments = ts?.segments ?? [];

  return (
    <section className="mt-24">
      <div className="mx-auto max-w-column px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          05
        </p>
        <h2 className="mt-4 font-serif text-section text-ink-primary tracking-tight">
          Two segments, every month, across more than ten agencies.
        </h2>
        <p className="mt-4 font-serif italic text-standfirst text-ink-muted">
          The number of distinct UN agencies with open digital roles in each
          segment, plotted monthly.
        </p>

        <div className="mt-8">
          <ConcurrencyChart segments={segments} />
        </div>

        <p className="mt-4 text-caption text-ink-muted">
          Data, Analytics &amp; AI and IT Operations &amp; Support have
          sustained double-digit concurrent organisational demand throughout
          the window. When ten or more agencies chase the same segment in the
          same month, time-to-close lengthens and headhunter fees rise
          system-wide.
        </p>
      </div>
    </section>
  );
}
