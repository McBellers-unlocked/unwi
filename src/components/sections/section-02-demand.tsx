import {
  getLatestSnapshotDate,
  getSegmentWindowAggregates,
  SEGMENT_LABELS,
  type SegmentCode,
  type SegmentWindowPoint,
} from "@/lib/data";
import { SegmentDemand } from "./section-02-client";
import type { ScatterDatum } from "./section-02-scatter";

function shape(rows: SegmentWindowPoint[]): ScatterDatum[] {
  return rows
    .filter((r) => r.segment !== "NOT_DIGITAL")
    .map((r) => ({
      segment: r.segment,
      label:
        SEGMENT_LABELS[r.segment as SegmentCode] ?? r.segment,
      roles: r.roles,
      orgs: r.orgs,
    }));
}

export async function Section02Demand() {
  const [w30, w60, w90, snapshotDate] = await Promise.all([
    getSegmentWindowAggregates({ windowDays: 30 }),
    getSegmentWindowAggregates({ windowDays: 60 }),
    getSegmentWindowAggregates({ windowDays: 90 }),
    getLatestSnapshotDate(),
  ]);

  return (
    <section className="mt-24">
      <div className="mx-auto max-w-column px-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          02
        </p>
        <SegmentDemand
          window30={shape(w30)}
          window60={shape(w60)}
          window90={shape(w90)}
          snapshotDate={snapshotDate}
        />
      </div>
    </section>
  );
}
