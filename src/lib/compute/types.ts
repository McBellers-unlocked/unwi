/**
 * Types for the full findings object returned by computeObservatoryData().
 *
 * This is the shape written to daily_snapshots.raw_metrics — the dashboard reads
 * from here (plus the dedicated per-agency and per-skill-cluster tables) and
 * never re-computes.
 */

/** Shape of a single raw job as returned by the Supabase jobs-api edge function. */
export interface RawJob {
  id: string;
  title: string | null;
  organization: string | null;
  organization_id: string | null;
  logo_url: string | null;
  location: string | null;
  country: string | null;
  description: string | null;
  posted_date: string | null; // YYYY-MM-DD
  source: string | null;
  link: string | null;
  professional_field: string | null;
  level: string | null;
  grade_code: string | null;
  expires_at: string | null; // ISO
  closing_date: string | null; // YYYY-MM-DD
  created_at: string | null; // ISO
  status: string | null;
  backfill_source: string | null;
}

export interface ClusterCount {
  cluster: string;
  count: number;
}

export interface SystemBlock {
  totalActivePosts: number;
  totalYtdPosts: number;
  distinctAgencies: number;
  digitalPostsCount: number;
  digitalPostsSharePct: number;
  duplicationEventsCount: number;
  duplicationCostEur: number;
  medianTimeToCloseDays: number | null;
  hqConcentrationPct: number | null;
  topAgenciesByVolume: Array<{
    organization: string;
    count: number;
    pctOfSystem: number;
  }>;
}

export interface DecentralisationBlock {
  byAgency: Array<{
    organization: string;
    totalPLevel: number;
    hqPct: number;
    fieldPct: number;
  }>;
  /** All agencies with >=20 P-level postings, HQ-concentration desc. */
  rankedTable: Array<{
    organization: string;
    totalPLevel: number;
    hqPct: number;
    fieldPct: number;
  }>;
  topDutyStations: Array<{
    location: string;
    concurrentPostings: number;
    agencies: number;
  }>;
}

export interface DuplicationExample {
  normalizedTitle: string;
  agencies: string[];
  dates: string[]; // posted_date for each match
  locations: string[];
  count: number;
}

export interface DuplicationBlock {
  eventsCount: number;
  costEur: number;
  costUsd: number;
  topExamples: DuplicationExample[];
  methodology: {
    usdPerRecruitment: number;
    usdToEurRate: number;
    windowDays: number;
    anchorDate: string;
  };
}

export interface SkillsBlock {
  /** Ranked 90-day post count per cluster, from latest day. */
  byCluster90d: ClusterCount[];
  /** Monthly history across all clusters; used for trend + digital area charts. */
  monthly: Array<{ month: string; cluster: string; count: number }>;
  /** Top 3 growing clusters across the available window, by % change. */
  topGrowingClusters: Array<{
    cluster: string;
    pctChange: number;
    startCount: number;
    endCount: number;
  }>;
}

export interface AgencyFingerprint {
  organization: string;
  totalActivePosts: number;
  pLevelPosts: number;
  hqPosts: number;
  fieldPosts: number;
  medianTimeToCloseDays: number | null;
  repostingRatePct: number | null;
  consultantRatioPct: number | null;
  topSkillClusters: ClusterCount[];
}

export interface DigitalTalentBlock {
  headline: string;
  sharePctYtd: number;
  sharePctPriorPeriod: number;
  ytdAnchor: string;
  priorPeriodStart: string;
  priorPeriodEnd: string;
  monthlyBySubCluster: Array<{
    month: string;
    cluster: string;
    count: number;
  }>;
  topAgencies: Array<{ organization: string; count: number }>;
  concurrentDuplication: {
    eventsCount: number;
    costEur: number;
    topDutyStations: Array<{ location: string; count: number }>;
  };
}

export interface ForwardSignalRole {
  id: string;
  title: string;
  organization: string;
  location: string;
  closingDate: string;
  cluster: string;
}

export interface ForwardSignalBlock {
  headline: string;
  within30d: ForwardSignalRole[];
  within60d: ForwardSignalRole[];
}

export interface ObservatoryFindings {
  snapshotDate: string;
  computedAt: string;
  inputRowsTotal: number;
  inputRowsAfterUnFilter: number;
  system: SystemBlock;
  decentralisation: DecentralisationBlock;
  duplication: DuplicationBlock;
  skills: SkillsBlock;
  agencies: AgencyFingerprint[];
  digitalTalent: DigitalTalentBlock;
  forwardSignal: ForwardSignalBlock;
}
