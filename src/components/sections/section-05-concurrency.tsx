import { SectionShell } from "@/components/section-shell";
import { getConcurrencyTimeseries, SEGMENT_LABELS } from "@/lib/data";
import { ConcurrencyChart } from "./section-05-chart";

export async function Section05Concurrency() {
  const ts = await getConcurrencyTimeseries();
  const segments = ts?.segments ?? [];

  const withPeak = segments.map((s) => ({
    ...s,
    peak: Math.max(0, ...s.points.map((p) => p.distinct_organisations)),
  }));
  const top6 = withPeak.sort((a, b) => b.peak - a.peak).slice(0, 6);

  const monthSet = new Set<string>();
  for (const s of top6) {
    for (const p of s.points) monthSet.add(p.month);
  }
  const months = Array.from(monthSet).sort();

  const data = months.map((m) => {
    const row: Record<string, number | string> = { month: m };
    for (const s of top6) {
      const point = s.points.find((p) => p.month === m);
      row[s.segment] = point?.distinct_organisations ?? 0;
    }
    return row;
  });

  const seriesMeta = top6.map((s) => ({
    key: s.segment,
    label:
      SEGMENT_LABELS[s.segment as keyof typeof SEGMENT_LABELS] ?? s.segment,
  }));

  const topPeak = top6[0];

  return (
    <SectionShell
      id="section-5"
      number={5}
      title="Concurrent Hiring Pressure"
      subtitle="Distinct organisations in-market for each segment, by month."
      takeaway={
        <>
          <p>
            Peak concurrency:{" "}
            <strong>
              {topPeak
                ? SEGMENT_LABELS[topPeak.segment as keyof typeof SEGMENT_LABELS] ??
                  topPeak.segment
                : "—"}
            </strong>{" "}
            at {topPeak?.peak ?? 0} organisations in-market simultaneously.
          </p>
          <p>
            When multiple agencies chase the same segment in the same month,
            headhunter fees rise and time-to-close lengthens system-wide.
          </p>
        </>
      }
    >
      <ConcurrencyChart data={data} series={seriesMeta} />
    </SectionShell>
  );
}
