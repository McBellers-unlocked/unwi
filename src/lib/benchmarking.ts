/**
 * Strategic benchmarking dataset.
 *
 * Snapshot of the AI-Core analysis from the UNICC Workforce Readiness
 * Strategic Benchmarking paper (v3, April 2026). Refresh quarterly by
 * editing the constants below — every figure on the benchmarking view
 * reads from this file.
 *
 * Source: classifier-service/reference/UNICC_Workforce_Readiness_Strategic_Benchmarking_v3.docx
 */

export const BENCHMARKING_META = {
  paperTitle: "UNICC Workforce Readiness — Strategic Benchmarking",
  paperVersion: "v3",
  paperDate: "April 2026",
  windowDescription:
    "UN-system peer postings drawn from the aggregated UN jobs board, " +
    "1 August 2025 to 28 April 2026 (n=856 across 47 organisations).",
  unicсBaseline: {
    totalStaffPDs: 373,
    aiCorePDs: 7,
    aiCorePct: 1.9,
  },
} as const;

/**
 * Headline peer comparison. UNICC figure is *stock* (full PD library);
 * UN-system peer figures are *flow* (postings issued during the 9-month
 * window). Private-sector benchmark is from the Cisco AI Workforce
 * Consortium ICT in Motion 2025 study (G7 economies).
 */
export type PeerRow = {
  label: string;
  n: number | null;
  pct: number;
  kind: "unicc" | "un-system" | "benchmark";
  note?: string;
};

export const PEER_LADDER: PeerRow[] = [
  {
    label: "UNICC PD library (staff)",
    n: 373,
    pct: 1.9,
    kind: "unicc",
    note: "Stock figure — April 2026 PD library",
  },
  {
    label: "UN Secretariat",
    n: 526,
    pct: 4.0,
    kind: "un-system",
    note: "Closest institutional analogue",
  },
  {
    label: "UN Funds & Programmes",
    n: 257,
    pct: 5.4,
    kind: "un-system",
  },
  {
    label: "UNOPS",
    n: 43,
    pct: 18.6,
    kind: "un-system",
  },
  {
    label: "UNDP",
    n: 17,
    pct: 35.3,
    kind: "un-system",
    note: "Closest UN-system peer — same frameworks, similar mandate",
  },
  {
    label: "World Bank Group",
    n: 15,
    pct: 40.0,
    kind: "un-system",
    note: "Achievable ceiling within a multilateral framework",
  },
  {
    label: "Private sector ICT (Cisco/G7)",
    n: null,
    pct: 78.0,
    kind: "benchmark",
    note: "The bar UNICC's own technology partners recruit against",
  },
];

/**
 * UNICC PD library, function-level. The strategically consequential
 * finding: 213 of 373 PDs (38% of the staff library) sit in functions
 * with zero AI-Core specifications.
 */
export type FunctionRow = {
  fn: string;
  total: number;
  aiCore: number;
  pct: number;
  note?: string;
};

export const UNICC_FUNCTIONS: FunctionRow[] = [
  {
    fn: "Development",
    total: 110,
    aiCore: 4,
    pct: 3.6,
    note: "Includes 3 AI/ML Unit data-science roles",
  },
  {
    fn: "Cybersecurity",
    total: 97,
    aiCore: 0,
    pct: 0.0,
    note: "Zero AI-Core in UNICC's largest function",
  },
  {
    fn: "Management / Leadership",
    total: 35,
    aiCore: 1,
    pct: 2.9,
    note: "Chief, AI Hub",
  },
  {
    fn: "Digital Workplace",
    total: 34,
    aiCore: 0,
    pct: 0.0,
    note: "M365 / Copilot landscape",
  },
  {
    fn: "Enterprise Apps",
    total: 33,
    aiCore: 0,
    pct: 0.0,
    note: "SAP / ServiceNow / Oracle AI products in GA",
  },
  {
    fn: "Network",
    total: 31,
    aiCore: 0,
    pct: 0.0,
  },
  {
    fn: "Quality / Training",
    total: 19,
    aiCore: 3,
    pct: 15.8,
    note: "AI/ML Unit base",
  },
  {
    fn: "Project Management",
    total: 18,
    aiCore: 0,
    pct: 0.0,
  },
  {
    fn: "Solution Delivery",
    total: 13,
    aiCore: 1,
    pct: 7.7,
    note: "Data Solution Architect",
  },
];

/**
 * Per-agency AI-Core flow figures over the 9-month window. Sorted by
 * AI-Core percentage descending in the UI; here listed by raw paper
 * order.
 */
export type AgencyRow = {
  agency: string;
  n: number;
  aiCore: number;
  pct: number;
};

export const AGENCY_BREAKDOWN: AgencyRow[] = [
  { agency: "World Bank Group", n: 15, aiCore: 6, pct: 40.0 },
  { agency: "UNDP", n: 17, aiCore: 6, pct: 35.3 },
  { agency: "UNDRR", n: 7, aiCore: 2, pct: 28.6 },
  { agency: "OCHA", n: 8, aiCore: 2, pct: 25.0 },
  { agency: "ITU", n: 5, aiCore: 1, pct: 20.0 },
  { agency: "UNOPS", n: 43, aiCore: 8, pct: 18.6 },
  { agency: "UNICEF", n: 106, aiCore: 4, pct: 3.8 },
  { agency: "UNEP", n: 41, aiCore: 1, pct: 2.4 },
  { agency: "WFP", n: 85, aiCore: 1, pct: 1.2 },
  { agency: "OICT", n: 9, aiCore: 0, pct: 0.0 },
  { agency: "UNRWA (IM HQ Amman)", n: 19, aiCore: 0, pct: 0.0 },
  { agency: "IOM", n: 23, aiCore: 0, pct: 0.0 },
  { agency: "UNCTAD", n: 42, aiCore: 0, pct: 0.0 },
  { agency: "WIPO", n: 9, aiCore: 0, pct: 0.0 },
  { agency: "WHO", n: 11, aiCore: 0, pct: 0.0 },
];

/**
 * Convergence-trajectory scenarios from §4 of the paper. Each scenario
 * runs from the current 1.9% baseline at Year 0 to its Year-5 endpoint.
 * Year-1 and Year-5 values are anchored; Years 2-4 are interpolated
 * geometrically for a smooth in-between curve.
 */
export type Scenario = {
  id: "A" | "B" | "C" | "D";
  name: string;
  detail: string;
  recommended?: boolean;
  year1: number;
  year5: number;
  reaches: string;
};

export const SCENARIOS: Scenario[] = [
  {
    id: "A",
    name: "Status quo",
    detail: "No template change",
    year1: 1.9,
    year5: 1.9,
    reaches: "Nothing — relative gap widens",
  },
  {
    id: "B",
    name: "AI lens added to PD template",
    detail: "Q3 2026 template change only",
    year1: 8,
    year5: 27,
    reaches: "UNOPS-equivalent by Year 3",
  },
  {
    id: "C",
    name: "Template + priority function refresh",
    detail: "Refresh ~195 PDs in priority functions",
    recommended: true,
    year1: 22,
    year5: 37,
    reaches: "UNDP-equivalent by Year 4",
  },
  {
    id: "D",
    name: "Full PD library refresh",
    detail: "12-18 month refresh of full library",
    year1: 38,
    year5: 60,
    reaches: "World Bank / private-sector parity by Year 2",
  },
];

/**
 * Reference lines on the convergence chart: peer figures as
 * point-in-time anchors. Both are likely higher one year out given the
 * Section-1 trajectories.
 */
export const SCENARIO_REFERENCE_LINES = [
  { label: "UNDP today", pct: 35.3, color: "#0A3C5A" },
  { label: "World Bank today", pct: 40.0, color: "#0A3C5A" },
  { label: "Private sector ICT (G7)", pct: 78.0, color: "#00A0B0" },
] as const;

/**
 * Five external data points on the pace of AI integration into role
 * specifications across the broader labour market — the trajectory the
 * UN system is being measured against.
 */
export type MarketSignal = {
  source: string;
  year: string;
  figure: string;
};

export const MARKET_SIGNALS: MarketSignal[] = [
  {
    source: "Cisco AI Workforce Consortium",
    year: "2025",
    figure:
      "78% of in-demand ICT roles in G7 economies require AI skills — core or supporting competency.",
  },
  {
    source: "WEF Future of Jobs",
    year: "2025",
    figure:
      "86% of large employers expect AI to transform their business by 2030; 77% plan AI-specific upskilling.",
  },
  {
    source: "PwC Global AI Jobs Barometer",
    year: "2025",
    figure:
      "Skills changing 66% faster YoY in AI-exposed roles. 56% wage premium. ~4× productivity growth.",
  },
  {
    source: "LinkedIn Workforce Data",
    year: "2025-26",
    figure:
      "70% YoY growth in postings requiring AI literacy. 177% growth in members adding AI skills since 2023.",
  },
  {
    source: "Lightcast / Stanford AI Index",
    year: "2025-26",
    figure:
      "AI postings +73% then +109% YoY. 8-13% of tech postings reference AI across major markets.",
  },
];

/**
 * Recommendation block — Scenario C.
 */
export const RECOMMENDATION = {
  scenario: "C" as const,
  title: "Refresh the AI-absent functions first",
  summary:
    "Refresh the priority high-volume, AI-absent functions during Year 1 — approximately 195 PDs across Cybersecurity, Digital Workplace, Enterprise Apps, and Network — in parallel with the AI lens being added to the PD template in Q3 2026.",
  rows: [
    {
      term: "Owner",
      detail:
        "Director of HR (PD classification programme). Section Chiefs on priority function selection. Director of Data and AI on AI-Core specification language. Chief of AI Hub on alignment with the unit's published taxonomy.",
    },
    {
      term: "Deliverable",
      detail:
        "(a) PD template AI lens by Q3 2026; (b) ~195 priority-function PDs refreshed by Q4 2027; (c) consultant TOR refresh by Q2 2027.",
    },
    {
      term: "Decision criterion",
      detail:
        "Quarterly review of UNICC JVN flow at the AI-Core bar against UNDP, UNOPS, and World Bank Group. On plan if UNICC's quarterly JVN AI-Core rate is rising and the UNDP gap is narrowing.",
    },
    {
      term: "Escalation",
      detail:
        "Move to Scenario D (full library refresh, 12-18 months) if (i) UNDP gap fails to narrow within 12 months, or (ii) UNDP figure moves up >10pp in two quarters.",
    },
  ],
} as const;
