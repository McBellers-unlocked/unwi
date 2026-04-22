import { SectionShell } from "@/components/section-shell";
import { getActiveRoles, SEGMENT_LABELS } from "@/lib/data";
import { ForwardSignalTable } from "./section-08-table";

export async function Section08ForwardSignal() {
  const [window30, window60] = await Promise.all([
    getActiveRoles({ windowDays: 30 }),
    getActiveRoles({ windowDays: 60 }),
  ]);

  // Shape-by-segment summary over the 30-day window, so the reader sees the
  // pipeline composition before drilling into individual roles.
  const counts30 = new Map<string, number>();
  for (const r of window30) {
    counts30.set(r.segment, (counts30.get(r.segment) ?? 0) + 1);
  }
  const summary = [...counts30.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([seg, n]) => ({
      seg,
      n,
      label: SEGMENT_LABELS[seg as keyof typeof SEGMENT_LABELS] ?? seg,
    }));

  return (
    <SectionShell
      id="section-8"
      number={8}
      title="Forward Signal"
      subtitle="Active roles closing in the next 30 and 60 days. Filter by segment to spot bottlenecks."
    >
      {summary.length > 0 && (
        <div className="mb-6 bg-muted-soft px-4 py-3 rounded-md">
          <p className="text-[11px] uppercase tracking-wider text-muted mb-2">
            Next 30 days by segment · {window30.length} roles total
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-navy">
            {summary.map(({ seg, n, label }) => (
              <span key={seg}>
                <strong>{n}</strong>{" "}
                <span className="text-muted">{label}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      <ForwardSignalTable
        roles30={window30.map((r) => ({
          id: r.roleId,
          title: r.title,
          organisation: r.organisation,
          segment: r.segment,
          location: r.location,
          closingDate: r.closingDate,
          sourceUrl: r.sourceUrl,
        }))}
        roles60={window60.map((r) => ({
          id: r.roleId,
          title: r.title,
          organisation: r.organisation,
          segment: r.segment,
          location: r.location,
          closingDate: r.closingDate,
          sourceUrl: r.sourceUrl,
        }))}
      />
    </SectionShell>
  );
}
