/**
 * npm run sanity-check
 *
 * Pulls the full aggregator, runs computeObservatoryData(), writes findings.json
 * at repo root, and prints a terse summary. Does NOT touch Aurora — this is a
 * pre-DB sanity pass so Matt can eyeball numbers before we wire the UI.
 */
import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fetchAllJobs } from "../src/lib/supabase";
import { computeObservatoryData } from "../src/lib/compute/observatory";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const t0 = Date.now();
  console.log("Pulling aggregator...");
  const jobs = await fetchAllJobs({
    onPage: (p, n) => console.log(`  page ${p}: ${n} rows`),
  });
  console.log(`Fetched ${jobs.length} rows in ${Date.now() - t0}ms`);

  console.log("Computing findings...");
  const t1 = Date.now();
  const findings = computeObservatoryData(jobs);
  console.log(`Computed in ${Date.now() - t1}ms`);

  const outPath = resolve(process.cwd(), "findings.json");
  writeFileSync(outPath, JSON.stringify(findings, null, 2) + "\n");
  console.log(`Wrote ${outPath}`);

  const s = findings.system;
  console.log();
  console.log(`Snapshot:   ${findings.snapshotDate}`);
  console.log(
    `Input:      ${findings.inputRowsTotal} total -> ${findings.inputRowsAfterUnFilter} after UN filter`,
  );
  console.log(`Active:     ${s.totalActivePosts}`);
  console.log(`YTD:        ${s.totalYtdPosts}`);
  console.log(`Agencies:   ${s.distinctAgencies}`);
  console.log(
    `Digital:    ${s.digitalPostsCount} (${s.digitalPostsSharePct.toFixed(1)}%)`,
  );
  console.log(
    `Duplication: ${s.duplicationEventsCount} events  EUR ${s.duplicationCostEur.toFixed(0)}`,
  );
  console.log(
    `Median TTC: ${s.medianTimeToCloseDays ?? "n/a"} days  HQ:${s.hqConcentrationPct ?? "n/a"}%`,
  );

  console.log();
  console.log("Top 10 agencies:");
  for (const a of s.topAgenciesByVolume) {
    console.log(`  ${a.organization.padEnd(40)} ${String(a.count).padStart(4)}  ${a.pctOfSystem.toFixed(1)}%`);
  }

  console.log();
  console.log("Skill clusters (90d):");
  for (const c of findings.skills.byCluster90d) {
    console.log(`  ${c.cluster.padEnd(30)} ${String(c.count).padStart(5)}`);
  }

  console.log();
  console.log(findings.digitalTalent.headline);
  console.log(findings.forwardSignal.headline);
}

main().catch((err) => {
  console.error("sanity-check failed:", err);
  process.exit(1);
});
