"use client";

import { useState, type ReactNode } from "react";

type View = "hiring" | "benchmarking";

export function DashboardSwitcher({
  hiringSlot,
  benchmarkingSlot,
}: {
  hiringSlot: ReactNode;
  benchmarkingSlot: ReactNode;
}) {
  const [view, setView] = useState<View>("hiring");

  return (
    <>
      <ViewToggle view={view} onChange={setView} />
      <div className="mt-4">
        {view === "hiring" ? hiringSlot : benchmarkingSlot}
      </div>
    </>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  return (
    <nav
      aria-label="Dashboard view"
      className="mt-12 sticky top-0 z-30 backdrop-blur-sm"
      style={{
        background:
          "linear-gradient(to bottom, rgba(255,241,229,0.96) 0%, rgba(255,241,229,0.92) 70%, rgba(255,241,229,0) 100%)",
      }}
    >
      <div className="mx-auto max-w-wide px-6">
        <div className="flex flex-col gap-3 border-b border-rule pb-3 pt-4 md:flex-row md:items-end md:justify-between md:gap-8">
          <div className="flex items-baseline gap-1">
            <ToggleTab
              active={view === "hiring"}
              onClick={() => onChange("hiring")}
              label="Hiring snapshot"
              meta="Q1 2026"
            />
            <span aria-hidden className="text-ink-muted/50 text-[14px] mx-1">
              ·
            </span>
            <ToggleTab
              active={view === "benchmarking"}
              onClick={() => onChange("benchmarking")}
              label="Strategic benchmarking"
              meta="AI-Core, Apr 2026"
            />
          </div>
          <p className="font-serif italic text-[14px] text-ink-muted leading-snug max-w-md md:text-right">
            {view === "hiring"
              ? "Classifier-measured read of UN Common System digital postings."
              : "UNICC PDs against UN-system peers and private-sector ICT, at the AI-Core bar."}
          </p>
        </div>
      </div>
    </nav>
  );
}

function ToggleTab({
  active,
  onClick,
  label,
  meta,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  meta: string;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      aria-pressed={active}
      className={
        "group relative inline-flex items-baseline gap-2 px-1 pb-2 -mb-[1px] " +
        "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight"
      }
    >
      <span
        className={
          "font-serif text-[20px] md:text-[24px] tracking-tight leading-none " +
          (active
            ? "text-ink-primary font-semibold"
            : "text-ink-muted hover:text-ink-primary")
        }
      >
        {label}
      </span>
      <span
        className={
          "text-[11px] uppercase tracking-[0.18em] leading-none " +
          (active ? "text-highlight" : "text-ink-muted")
        }
      >
        {meta}
      </span>
      <span
        aria-hidden
        className={
          "absolute left-0 right-0 -bottom-[3px] h-[3px] transition-colors " +
          (active ? "bg-highlight" : "bg-transparent group-hover:bg-rule")
        }
      />
    </button>
  );
}
