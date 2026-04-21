/**
 * Keyword-based skill cluster tagging, v0.1.
 *
 * A role belongs to a cluster when its (title + description) text contains any
 * cluster keyword as a case-insensitive substring. A single role can belong to
 * multiple clusters — we count each cluster independently, which is what the
 * dashboard's stacked/horizontal breakdowns expect.
 *
 * Phase 2: swap for embedding-based classifier. Keep the cluster names stable
 * so the chart legend doesn't churn across versions.
 */

export const SKILL_CLUSTERS = {
  "AI / Machine Learning": [
    "machine learning",
    "artificial intelligence",
    "AI ",
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

/**
 * Case-insensitive substring match across all clusters.
 * Returns the set of cluster names the text belongs to.
 */
export function clustersFor(
  title: string | null | undefined,
  description: string | null | undefined,
): ClusterName[] {
  const text = `${title ?? ""} ${description ?? ""}`.toLowerCase();
  if (!text.trim()) return [];
  const hits: ClusterName[] = [];
  for (const [cluster, keywords] of Object.entries(SKILL_CLUSTERS) as Array<
    [ClusterName, readonly string[]]
  >) {
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) {
        hits.push(cluster);
        break;
      }
    }
  }
  return hits;
}
