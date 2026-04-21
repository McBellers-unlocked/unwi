/**
 * Keyword-based skill cluster tagging, v0.1.
 *
 * A role belongs to a cluster when its (title + description) text matches any
 * cluster keyword as a CASE-INSENSITIVE WORD-BOUNDARY match. A single role can
 * belong to multiple clusters — we count each cluster independently.
 *
 * Word-boundary matching matters: plain substring matches caused obvious
 * false positives (e.g. "SOC" → "social", "association"; "ERM" →
 * "determination"; "PMO" → "promote"). We now compile each keyword into a
 * regex with \b anchors. Acronyms and multi-word phrases both work.
 *
 * Phase 2: swap for embedding-based classifier. Keep the cluster names stable
 * so the chart legend doesn't churn across versions.
 */

export const SKILL_CLUSTERS = {
  "AI / Machine Learning": [
    "machine learning",
    "artificial intelligence",
    "AI",
    "deep learning",
    "LLM",
    "NLP",
    "neural network",
  ],
  "Data & Analytics": [
    "data analyst",
    "data scientist",
    "analytics",
    "SQL",
    "Power BI",
    "Tableau",
    "statistical",
    "data engineering",
  ],
  "Cyber & Security": [
    "cybersecurity",
    "cyber security",
    "information security",
    "SOC",
    "CISO",
    "penetration testing",
    "SIEM",
    "zero trust",
  ],
  "Cloud & Infrastructure": [
    "AWS",
    "Azure",
    "GCP",
    "Kubernetes",
    "DevOps",
    "cloud architect",
  ],
  "Climate & Environment": [
    "climate",
    "carbon",
    "decarbonization",
    "renewable",
    "sustainability specialist",
    "green finance",
  ],
  "Supply Chain & Logistics": [
    "supply chain",
    "logistics",
    "procurement specialist",
    "warehouse",
  ],
  "Risk & Compliance": [
    "risk officer",
    "compliance officer",
    "ERM",
    "internal audit",
    "fraud",
  ],
  "Digital Policy & Governance": [
    "digital policy",
    "digital governance",
    "AI governance",
    "digital transformation",
  ],
  "Programme & Project Management": [
    "project management",
    "programme management",
    "PMP",
    "PRINCE2",
    "PMO",
  ],
  "Humanitarian & Emergency": [
    "emergency response",
    "humanitarian coordination",
    "cluster lead",
    "crisis response",
  ],
} as const satisfies Record<string, readonly string[]>;

/** Digital Talent module aggregates these five clusters. */
export const DIGITAL_CLUSTERS: ReadonlyArray<keyof typeof SKILL_CLUSTERS> = [
  "AI / Machine Learning",
  "Data & Analytics",
  "Cyber & Security",
  "Cloud & Infrastructure",
  "Digital Policy & Governance",
];

export type ClusterName = keyof typeof SKILL_CLUSTERS;

// --- Compile once ----------------------------------------------------------

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Build a word-boundary regex for a keyword.
 *
 * `\b` in JS regex is an ASCII word boundary — the transition between a
 * word char [A-Za-z0-9_] and anything else. That means:
 *   - "AI"   → /\bai\b/i     matches "AI" whole-word, not "fail" or "paid"
 *   - "C++"  → /(?<![A-Za-z0-9_])c\+\+(?![A-Za-z0-9_])/i — \b doesn't work
 *     for non-word anchors, so we fall back to a lookaround pair
 *   - "SQL"  → /\bsql\b/i    fine
 *
 * For anything that starts/ends with a non-word character (punctuation), we
 * use the lookaround pair. For everything else, \b...\b is both correct and
 * cheaper.
 */
function compileKeyword(kw: string): RegExp {
  const trimmed = kw.trim();
  const startsNonWord = /^[^A-Za-z0-9_]/.test(trimmed);
  const endsNonWord = /[^A-Za-z0-9_]$/.test(trimmed);
  const body = escapeRegex(trimmed);
  const left = startsNonWord ? "(?<![A-Za-z0-9_])" : "\\b";
  const right = endsNonWord ? "(?![A-Za-z0-9_])" : "\\b";
  return new RegExp(`${left}${body}${right}`, "i");
}

const COMPILED: Record<ClusterName, RegExp[]> = Object.fromEntries(
  (Object.entries(SKILL_CLUSTERS) as Array<[ClusterName, readonly string[]]>).map(
    ([cluster, keywords]) => [cluster, keywords.map(compileKeyword)],
  ),
) as Record<ClusterName, RegExp[]>;

/**
 * Case-insensitive WORD-BOUNDARY match across all clusters.
 * Returns the set of cluster names the text belongs to.
 */
export function clustersFor(
  title: string | null | undefined,
  description: string | null | undefined,
): ClusterName[] {
  const text = `${title ?? ""} ${description ?? ""}`;
  if (!text.trim()) return [];
  const hits: ClusterName[] = [];
  for (const [cluster, patterns] of Object.entries(COMPILED) as Array<
    [ClusterName, RegExp[]]
  >) {
    for (const re of patterns) {
      if (re.test(text)) {
        hits.push(cluster);
        break;
      }
    }
  }
  return hits;
}
