import { SectionShell } from "@/components/section-shell";
import { getActiveRoles } from "@/lib/data";
import { ForwardSignalTable } from "./section-08-table";

export async function Section08ForwardSignal() {
  const [window30, window60] = await Promise.all([
    getActiveRoles({ windowDays: 30 }),
    getActiveRoles({ windowDays: 60 }),
  ]);

  return (
    <SectionShell
      id="section-8"
      number={8}
      title="Forward Signal"
      subtitle="Active roles closing in the next 30 and 60 days. Filter by segment to spot bottlenecks."
    >
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
