"use client";
import { useMemo, useState } from "react";

interface Role {
  id: string;
  title: string;
  organisation: string;
  segment: string;
  segmentLabel: string;
  location: string | null;
  closingDate: string | null;
  sourceUrl: string | null;
}

const SEGMENT_ORDER = [
  "ITOPS",
  "DATA_AI",
  "POLICY_ADVISORY",
  "INFO_KM",
  "CYBER",
  "SOFTWARE",
  "CLOUD",
  "PRODUCT",
  "ENTERPRISE",
] as const;

function shortSegment(segment: string): string {
  // Space-efficient labels for use inside the stacked bar.
  switch (segment) {
    case "ITOPS":           return "IT Ops";
    case "DATA_AI":         return "Data/AI";
    case "POLICY_ADVISORY": return "Policy";
    case "INFO_KM":         return "Info/KM";
    case "CYBER":           return "Cyber";
    case "SOFTWARE":        return "Software";
    case "CLOUD":           return "Cloud";
    case "PRODUCT":         return "Product";
    case "ENTERPRISE":      return "ERP";
    default:                return segment;
  }
}

function formatClose(d: string | null): string {
  if (!d) return "—";
  // Postgres date → short label
  const dt = new Date(d);
  if (Number.isNaN(dt.valueOf())) return d;
  return dt.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

export function ForwardSignal({
  window30,
  window60,
}: {
  window30: Role[];
  window60: Role[];
}) {
  const [win, setWin] = useState<30 | 60>(30);
  const roles = win === 30 ? window30 : window60;

  // Segment counts + top-2 highlight for stacked-bar colouring.
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of roles) m.set(r.segment, (m.get(r.segment) ?? 0) + 1);
    return m;
  }, [roles]);

  const orderedSegments = useMemo(() => {
    return SEGMENT_ORDER.filter((s) => (counts.get(s) ?? 0) > 0).sort(
      (a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0),
    );
  }, [counts]);

  const top2 = new Set(orderedSegments.slice(0, 2));
  const total = roles.length;

  return (
    <>
      <h2 className="mt-4 font-serif text-section text-ink-primary tracking-tight">
        {window30.length} digital roles close in the next 30 days.
      </h2>
      <p className="mt-4 font-serif italic text-standfirst text-ink-muted">
        Segment breakdown, filterable by period.
      </p>

      <div className="mt-8 flex gap-2">
        {[30, 60].map((w) => {
          const active = win === w;
          return (
            <button
              key={w}
              onClick={() => setWin(w as 30 | 60)}
              className={
                "px-4 py-1.5 text-[13px] font-medium transition-colors rounded-none border "
                + (active
                  ? "bg-highlight border-highlight text-white"
                  : "bg-transparent border-ink-muted/40 text-ink-primary hover:border-highlight hover:text-highlight")
              }
            >
              Next {w} days
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        <StackedBar
          counts={counts}
          orderedSegments={orderedSegments}
          top2={top2}
          total={total}
        />
      </div>

      <div className="mt-10">
        <RoleTable roles={roles} />
      </div>
    </>
  );
}

function StackedBar({
  counts,
  orderedSegments,
  top2,
  total,
}: {
  counts: Map<string, number>;
  orderedSegments: readonly string[];
  top2: Set<string>;
  total: number;
}) {
  if (total === 0) {
    return (
      <p className="text-caption text-ink-muted">
        No roles closing in this window.
      </p>
    );
  }
  return (
    <div>
      <div className="flex h-[26px] w-full">
        {orderedSegments.map((seg) => {
          const count = counts.get(seg) ?? 0;
          const pct = (count / total) * 100;
          const fill = top2.has(seg) ? "#00A0B0" : "#0A3C5A";
          return (
            <div
              key={seg}
              style={{ width: `${pct}%`, backgroundColor: fill }}
              className="border-r border-canvas last:border-r-0"
            />
          );
        })}
      </div>
      <div className="mt-2 flex w-full">
        {orderedSegments.map((seg) => {
          const count = counts.get(seg) ?? 0;
          const pct = (count / total) * 100;
          const showLabel = pct >= 7;
          return (
            <div
              key={seg}
              style={{ width: `${pct}%` }}
              className="text-[12px] text-ink-primary leading-tight"
            >
              {showLabel && (
                <span className="inline-block pl-1">
                  <span className="font-medium">{shortSegment(seg)}</span>
                  <span className="text-ink-muted numeric"> {count}</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoleTable({ roles }: { roles: Role[] }) {
  const visible = roles.slice(0, 24);
  return (
    <div>
      <div className="grid grid-cols-[1fr_180px_90px] gap-4 pb-3 border-b border-rule text-[11px] uppercase tracking-[0.15em] text-ink-muted">
        <span>Title</span>
        <span>Segment</span>
        <span className="text-right">Closes</span>
      </div>
      <ul>
        {visible.map((r) => (
          <li
            key={r.id}
            className="grid grid-cols-[1fr_180px_90px] gap-4 py-3 border-b border-rule items-baseline"
          >
            <span className="text-[14px] text-ink-primary">
              {r.sourceUrl ? (
                <a
                  href={r.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-highlight"
                >
                  {r.title}
                </a>
              ) : (
                r.title
              )}
              <span className="text-ink-muted"> · {r.organisation}</span>
            </span>
            <span className="text-[14px] text-ink-muted">
              {r.segmentLabel}
            </span>
            <span className="numeric text-[14px] text-ink-primary text-right">
              {formatClose(r.closingDate)}
            </span>
          </li>
        ))}
      </ul>
      {roles.length > visible.length && (
        <p className="mt-3 text-caption text-ink-muted">
          Showing {visible.length} of {roles.length}.
        </p>
      )}
    </div>
  );
}
