/**
 * Thin wrapper around the Supabase jobs-api edge function.
 *
 * Paginates with perPage=1000, include_all=true (critical — includes closed/
 * expired postings, needed for longitudinal analysis and duplication rolling
 * counters). One retry per page.
 */
import type { RawJob } from "@/lib/compute/types";

const DEFAULT_URL = "https://sjtdudezqssbmratdgmy.supabase.co/functions/v1/jobs-api";
const PER_PAGE = 1000;

function getEnv(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`${name} is not set. See .env.example.`);
  return v;
}

async function fetchPage(
  apiUrl: string,
  anonKey: string,
  page: number,
): Promise<{ items: RawJob[]; hasMore: boolean }> {
  const url = `${apiUrl}?include_all=true&perPage=${PER_PAGE}&page=${page}`;
  const headers: Record<string, string> = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    "User-Agent": "unwi-observatory/0.1",
  };

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const data = (await res.json()) as {
        items?: RawJob[];
        hasMore?: boolean;
      };
      return { items: data.items ?? [], hasMore: Boolean(data.hasMore) };
    } catch (err) {
      lastErr = err;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw new Error(
    `Supabase page ${page} failed: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
  );
}

/** Pull every active + historic posting from the aggregator. */
export async function fetchAllJobs(opts: {
  apiUrl?: string;
  anonKey?: string;
  onPage?: (page: number, rows: number) => void;
} = {}): Promise<RawJob[]> {
  const apiUrl = opts.apiUrl ?? getEnv("SUPABASE_JOBS_URL", DEFAULT_URL);
  const anonKey = opts.anonKey ?? getEnv("SUPABASE_ANON_KEY");

  const out: RawJob[] = [];
  let page = 1;
  while (true) {
    const { items, hasMore } = await fetchPage(apiUrl, anonKey, page);
    opts.onPage?.(page, items.length);
    if (items.length === 0 && page === 1) {
      throw new Error("jobs-api returned no items on page 1");
    }
    out.push(...items);
    if (!hasMore || items.length === 0) break;
    page += 1;
    // Safety: bail after 100 pages (100k rows) to avoid runaway pulls.
    if (page > 100) break;
  }
  return out;
}
