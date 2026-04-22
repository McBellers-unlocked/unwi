"use client";
import { useMemo, useState } from "react";
import { SEGMENT_LABELS } from "@/lib/segments";

interface Role {
  id: string;
  title: string;
  organisation: string;
  segment: string;
  location: string | null;
  closingDate: string | null;
  sourceUrl: string | null;
}

const SEGMENTS = Object.keys(SEGMENT_LABELS);

export function ForwardSignalTable({
  roles30,
  roles60,
}: {
  roles30: Role[];
  roles60: Role[];
}) {
  const [window, setWindow] = useState<30 | 60>(30);
  const [segment, setSegment] = useState<string>("");
  const source = window === 30 ? roles30 : roles60;

  const rows = useMemo(() => {
    return segment ? source.filter((r) => r.segment === segment) : source;
  }, [segment, source]);

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="flex rounded-md overflow-hidden border border-panel-line">
          {[30, 60].map((w) => (
            <button
              key={w}
              onClick={() => setWindow(w as 30 | 60)}
              className={`px-4 py-1.5 text-sm ${window === w ? "bg-navy text-white" : "bg-white text-navy"}`}
            >
              Next {w} days
            </button>
          ))}
        </div>
        <select
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
          className="border border-panel-line rounded-md px-3 py-1.5 text-sm bg-white text-navy"
        >
          <option value="">All segments</option>
          {SEGMENTS.map((s) => (
            <option key={s} value={s}>
              {SEGMENT_LABELS[s as keyof typeof SEGMENT_LABELS]}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted ml-auto">
          {rows.length} role{rows.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted-soft text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="text-left px-3 py-2">Title</th>
              <th className="text-left px-3 py-2">Organisation</th>
              <th className="text-left px-3 py-2">Segment</th>
              <th className="text-left px-3 py-2">Location</th>
              <th className="text-left px-3 py-2">Closing</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 100).map((r) => (
              <tr key={r.id} className="border-t border-panel-line">
                <td className="px-3 py-2 text-navy">
                  {r.sourceUrl ? (
                    <a
                      href={r.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-teal"
                    >
                      {r.title}
                    </a>
                  ) : (
                    r.title
                  )}
                </td>
                <td className="px-3 py-2 text-muted">{r.organisation}</td>
                <td className="px-3 py-2 text-muted">
                  {SEGMENT_LABELS[r.segment as keyof typeof SEGMENT_LABELS] ??
                    r.segment}
                </td>
                <td className="px-3 py-2 text-muted">{r.location ?? "—"}</td>
                <td className="px-3 py-2 text-muted">{r.closingDate ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted">
                  No roles closing in this window.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {rows.length > 100 && (
          <p className="text-xs text-muted mt-2">
            Showing first 100 of {rows.length}.
          </p>
        )}
      </div>
    </div>
  );
}
