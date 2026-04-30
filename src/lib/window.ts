/**
 * Window-selection constants. Lives outside `data.ts` so client components
 * (the selector UI) can import the type and labels without dragging in the
 * server-only DB layer.
 */
export type WindowKey = "q1" | "sinceAug";

export const WINDOW_KEYS: readonly WindowKey[] = ["q1", "sinceAug"] as const;

export const WINDOW_LABELS: Record<WindowKey, string> = {
  q1: "Q1 2026 Snapshot",
  sinceAug: "Since August",
};

export function parseWindow(raw: string | string[] | undefined): WindowKey {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return WINDOW_KEYS.includes(v as WindowKey) ? (v as WindowKey) : "q1";
}

/**
 * Period-aware copy strings for hero / section text. Centralised so we don't
 * sprinkle "Q1 2026" literals across the section files.
 */
export interface PeriodCopy {
  /** Top-of-page badge, e.g. "Q1 2026 Digital Issue" */
  badge: string;
  /** Hero standfirst tail: "in Q1 2026, covering ..." vs "since August 2025, covering ..." */
  heroStandfirst: string;
  /** Hero closer: "in Q1 2026" vs "since August 2025" */
  heroCloser: string;
  /** Section 04 line: "in Q1 2026" vs "since August 2025" */
  collisionsTimeframe: string;
  /** Section 06 caption fragment: "of Q1 2026 digital hiring" vs "of digital hiring since August 2025" */
  mapHeadline: string;
  /** Section 06 source line: "Q1 2026" vs "Aug 2025 — present" */
  mapSource: string;
  /** Section 09 methodology Period item */
  methodPeriod: string;
}

export function getPeriodCopy(window: WindowKey): PeriodCopy {
  if (window === "sinceAug") {
    return {
      badge: "Aug 2025 — present",
      heroStandfirst: "since August 2025, covering",
      heroCloser: "since August 2025",
      collisionsTimeframe: "since August 2025",
      mapHeadline: "of digital hiring since August 2025",
      mapSource: "UN Workforce Intelligence, Aug 2025 — present",
      methodPeriod: "August 2025 — present (rolling)",
    };
  }
  return {
    badge: "Q1 2026 Digital Issue",
    heroStandfirst: "in Q1 2026, covering",
    heroCloser: "in Q1 2026",
    collisionsTimeframe: "in Q1 2026",
    mapHeadline: "of Q1 2026 digital hiring",
    mapSource: "UN Workforce Intelligence, Q1 2026",
    methodPeriod: "Q1 2026 (Jan 1 — Mar 31) vs Q4 2025 (Oct 1 — Dec 31)",
  };
}
