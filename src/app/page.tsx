import { DashboardSwitcher } from "@/components/dashboard-switcher";
import { EmptyState } from "@/components/empty-state";
import { Hero } from "@/components/hero";
import { MoversCallout } from "@/components/movers-callout";
import { ScrollProgress } from "@/components/scroll-progress";
import { BenchmarkingView } from "@/components/sections/benchmarking";
import { Section00Kpi } from "@/components/sections/section-00-kpi";
import { Section01Shape } from "@/components/sections/section-01-shape";
import { Section02Demand } from "@/components/sections/section-02-demand";
import { Section03Shift } from "@/components/sections/section-03-shift";
import { Section04Profiles } from "@/components/sections/section-04-profiles";
import { Section05Concurrency } from "@/components/sections/section-05-concurrency";
import { Section06Map } from "@/components/sections/section-06-map";
import { Section07BuildBuy } from "@/components/sections/section-07-buildbuy";
import { Section08Signal } from "@/components/sections/section-08-signal";
import { Section09Methodology } from "@/components/sections/section-09-methodology";
import { Section10Roadmap } from "@/components/sections/section-10-roadmap";
import { SinceAugKpi } from "@/components/sections/since-aug-kpi";
import { SinceAugTopLists } from "@/components/sections/since-aug-top-lists";
import { WindowSelector } from "@/components/window-selector";
import {
  getAvailableSnapshotDates,
  getComparatorShares,
  getGeographyTrend,
  getSegmentDistributionTrend,
  getSinceAugTrends,
  getSnapshotMeta,
  getStaffVsConsultantTrend,
  parseWindow,
  resolveWindow,
} from "@/lib/data";

export const dynamic = "force-dynamic";

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.valueOf())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function LongformPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const window = parseWindow(sp.window);
  const isQ1 = window === "q1";

  // Benchmarking view is purely static — surface it even when the DB is
  // unreachable. Hiring view stays gated behind a real meta row.
  const meta = await getSnapshotMeta().catch(() => null);

  const hiringSlot = meta ? (
    <HiringDashboard window={window} isQ1={isQ1} />
  ) : (
    <div className="pt-12 pb-16">
      <div className="mx-auto max-w-column px-6">
        <EmptyState />
      </div>
    </div>
  );

  return (
    <>
      <ScrollProgress />
      <main className="min-h-screen bg-canvas text-ink-body pb-40">
        <DashboardSwitcher
          hiringSlot={hiringSlot}
          benchmarkingSlot={<BenchmarkingView />}
          defaultView={meta ? "hiring" : "benchmarking"}
        />
      </main>
    </>
  );
}

async function HiringDashboard({
  window,
  isQ1,
}: {
  window: "q1" | "sinceAug";
  isQ1: boolean;
}) {
  const [
    dates,
    svcTrend,
    comparator,
    sinceAugTrends,
    q1SegTrend,
    q1GeoTrend,
  ] = await Promise.all([
    getAvailableSnapshotDates(),
    isQ1 ? getStaffVsConsultantTrend(window) : Promise.resolve(null),
    isQ1 ? getComparatorShares() : Promise.resolve(null),
    isQ1 ? Promise.resolve(null) : getSinceAugTrends(),
    isQ1 ? getSegmentDistributionTrend(window) : Promise.resolve(null),
    isQ1 ? getGeographyTrend(window) : Promise.resolve(null),
  ]);

  const segTrend = isQ1 ? q1SegTrend : sinceAugTrends?.segTrend ?? null;
  const geoTrend = isQ1 ? q1GeoTrend : sinceAugTrends?.geoTrend ?? null;

  const resolved = resolveWindow(window, dates);
  const caption = (() => {
    if (isQ1) {
      return resolved
        ? `Q1 2026 cut · classifier-measured snapshot of open digital roles, refreshed daily · latest ${fmtDate(resolved.endDate)}`
        : undefined;
    }
    if (sinceAugTrends?.period) {
      const { from, to } = sinceAugTrends.period;
      const nd = sinceAugTrends.segTrend.end.find(
        (s) => s.segment === "NOT_DIGITAL",
      );
      const totalDigital = sinceAugTrends.segTrend.end
        .filter((s) => s.segment !== "NOT_DIGITAL")
        .reduce((s, r) => s + r.count, 0);
      const totalAll = totalDigital + (nd?.count ?? 0);
      return `${fmtDate(from)} → ${fmtDate(to)} · ${totalAll.toLocaleString("en-GB")} postings (${totalDigital.toLocaleString("en-GB")} digital) · classifier-measured aggregates over the wider window`;
    }
    return "Since-August aggregates not yet populated — re-run the classifier to backfill.";
  })();

  return (
    <>
      <Hero window={window} />

      <div className="mx-auto max-w-column px-6 mt-8">
        <WindowSelector current={window} caption={caption} />
      </div>

      {isQ1 ? (
        <>
          <Section00Kpi />
          <Section01Shape trend={segTrend} comparator={comparator} />
          <Section02Demand />
          <MoversCallout />
          <Section03Shift />
          <Section04Profiles />
          <Section05Concurrency />
          <Section06Map trend={geoTrend} window={window} />
          <Section07BuildBuy trend={svcTrend} />
          <Section08Signal />
          <Section09Methodology window={window} />
          <Section10Roadmap />
        </>
      ) : (
        <>
          <SinceAugKpi />
          <Section05Concurrency />
          <Section01Shape trend={segTrend} />
          <SinceAugTopLists />
          <Section06Map trend={geoTrend} window={window} />
          <Section09Methodology window={window} />
          <Section10Roadmap />
        </>
      )}
    </>
  );
}
