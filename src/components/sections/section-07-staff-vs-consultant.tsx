import { SectionShell } from "@/components/section-shell";
import { getStaffVsConsultant, SEGMENT_LABELS } from "@/lib/data";
import { StaffVsConsultantBar } from "./section-07-chart";

export async function Section07StaffVsConsultant() {
  const svc = await getStaffVsConsultant();
  const segments = svc?.segments ?? [];

  const data = segments
    .map((s) => ({
      segment: s.segment,
      label:
        SEGMENT_LABELS[s.segment as keyof typeof SEGMENT_LABELS] ?? s.segment,
      staff: s.staff_count,
      consultant: s.consultant_count,
      total: s.staff_count + s.consultant_count,
      consultantPct: s.consultant_share_pct,
    }))
    .sort((a, b) => b.total - a.total);

  const mostConsultant = [...data].sort(
    (a, b) => b.consultantPct - a.consultantPct,
  )[0];
  const leastConsultant = [...data].sort(
    (a, b) => a.consultantPct - b.consultantPct,
  )[0];

  return (
    <SectionShell
      id="section-7"
      number={7}
      title="Staff vs Consultant"
      subtitle="Contract form split across the 9 digital segments."
      takeaway={
        <>
          <p>
            Most reliant on consultants:{" "}
            <strong>{mostConsultant?.label ?? "—"}</strong> at{" "}
            {mostConsultant?.consultantPct.toFixed(0) ?? 0}%.
          </p>
          <p>
            Most staff-heavy:{" "}
            <strong>{leastConsultant?.label ?? "—"}</strong> at{" "}
            {leastConsultant?.consultantPct.toFixed(0) ?? 0}% consultant share.
          </p>
        </>
      }
    >
      <StaffVsConsultantBar data={data} />
    </SectionShell>
  );
}
