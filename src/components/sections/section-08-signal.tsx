import { getActiveRoles, SEGMENT_LABELS } from "@/lib/data";
import { ForwardSignal } from "./section-08-client";

export async function Section08Signal() {
  const [window30, window60] = await Promise.all([
    getActiveRoles({ windowDays: 30 }),
    getActiveRoles({ windowDays: 60 }),
  ]);

  const shape = (
    rows: Awaited<ReturnType<typeof getActiveRoles>>,
  ) =>
    rows.map((r) => ({
      id: r.roleId,
      title: r.title,
      organisation: r.organisation,
      segment: r.segment,
      segmentLabel:
        SEGMENT_LABELS[r.segment as keyof typeof SEGMENT_LABELS] ?? r.segment,
      location: r.location,
      closingDate: r.closingDate,
      sourceUrl: r.sourceUrl,
    }));

  return (
    <section className="mt-24">
      <div className="mx-auto max-w-column px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          08
        </p>
        <ForwardSignal
          window30={shape(window30)}
          window60={shape(window60)}
        />
      </div>
    </section>
  );
}
