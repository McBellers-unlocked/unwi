/**
 * Title normalisation for duplication detection + re-posting rate.
 *
 * Normalised title = same canonical string when two roles are "the same role
 * at a different org" for duplication, or the same role being re-posted by
 * the same org for reposting-rate.
 *
 * Steps (in order):
 *   1. lowercase
 *   2. drop UN grade suffixes (P-1..P-5, D-1..D-2, G-1..G-7, NO-A..NO-D, ICA etc.)
 *   3. drop trailing location suffix after the first comma
 *   4. strip punctuation, collapse whitespace
 */

const GRADE_PATTERNS = [
  /\b(p|d|g|no|usg|asg|ica|ssa)[\s\-]*[0-9]+[a-z]?\b/gi,
  /\bp[\s\-]*\d\/d[\s\-]*\d\b/gi,
  /\bic[\s\-]?[abc]\b/gi,
];

// Strip everything that isn't alphanumeric, underscore, or whitespace.
const PUNCT = /[^\w\s]/g;

export function normalizeTitle(raw: string | null | undefined): string {
  if (!raw) return "";
  let t = raw.toLowerCase();

  // Strip known grade suffixes first — these appear mid-title in UN postings.
  for (const pat of GRADE_PATTERNS) {
    t = t.replace(pat, " ");
  }

  // Drop everything after the first comma (location/duty-station suffix).
  const firstComma = t.indexOf(",");
  if (firstComma >= 0) t = t.slice(0, firstComma);

  // Strip punctuation, collapse whitespace.
  t = t.replace(PUNCT, " ");
  t = t.replace(/\s+/g, " ").trim();

  return t;
}

/**
 * Token-Jaccard similarity. Used for re-posting detection where near-identical
 * titles (same role, minor wording tweaks) should count as one re-post.
 */
export function tokenJaccard(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const ta = new Set(a.split(/\s+/).filter(Boolean));
  const tb = new Set(b.split(/\s+/).filter(Boolean));
  if (ta.size === 0 && tb.size === 0) return 1;
  let intersect = 0;
  for (const tok of ta) if (tb.has(tok)) intersect++;
  const union = ta.size + tb.size - intersect;
  return union === 0 ? 0 : intersect / union;
}
