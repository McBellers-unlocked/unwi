/**
 * Partner organisations actively using UNICC's workforce-intelligence
 * data. Surfaced under the hero as a small "in use by" line. Add new
 * partners here as they sign up — single source of truth.
 *
 * If the array is empty, the hero hides the partner line entirely.
 */
export interface Partner {
  name: string;
  /** One-line note for internal context; not currently rendered. */
  note?: string;
}

export const PARTNERS: readonly Partner[] = [
  { name: "IMF", note: "active hiring collaboration" },
] as const;
