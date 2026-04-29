"use client";

import { useState } from "react";
import { SegmentScatter, type ScatterDatum } from "./section-02-scatter";

type Win = 30 | 60 | 90;

export function SegmentDemand({
  window30,
  window60,
  window90,
  snapshotDate,
}: {
  window30: ScatterDatum[];
  window60: ScatterDatum[];
  window90: ScatterDatum[];
  snapshotDate: string | null;
}) {
  const [win, setWin] = useState<Win>(30);
  const points = win === 30 ? window30 : win === 60 ? window60 : window90;

  return (
    <>
      <h2 className="mt-4 font-serif text-section text-ink-primary tracking-tight">
        A few segments do the bulk of the hiring. The rest are niche.
      </h2>
      <p className="mt-4 font-serif italic text-standfirst text-ink-muted">
        Role volume plotted against organisational participation. Segments in
        the top-right are the ones every agency is chasing.
      </p>

      <div className="mt-8 flex gap-2">
        {([30, 60, 90] as const).map((w) => {
          const active = win === w;
          return (
            <button
              key={w}
              onClick={() => setWin(w)}
              className={
                "px-4 py-1.5 text-[13px] font-medium transition-colors rounded-none border " +
                (active
                  ? "bg-highlight border-highlight text-white"
                  : "bg-transparent border-ink-muted/40 text-ink-primary hover:border-highlight hover:text-highlight")
              }
            >
              Last {w} days
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        <SegmentScatter data={points} window={win} />
      </div>

      <p className="mt-4 text-caption text-ink-muted">
        Each dot is one of nine digital segments. Roles posted in the last{" "}
        {win} days
        {snapshotDate ? `, snapshot ${snapshotDate}` : ""}. Segments toward the
        top-right are where the UN system competes with itself most. Source: UN
        Workforce Intelligence.
      </p>
    </>
  );
}
