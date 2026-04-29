import { DashboardSwitcher } from "@/components/dashboard-switcher";
import { EmptyState } from "@/components/empty-state";
import { Hero } from "@/components/hero";
import { ScrollProgress } from "@/components/scroll-progress";
import { BenchmarkingView } from "@/components/sections/benchmarking";
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
import { getSnapshotMeta } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function LongformPage() {
  // Benchmarking view is purely static — surface it even when the DB is
  // unreachable (no DATABASE_URL, transient Aurora outage, empty snapshots
  // table). Hiring view stays gated behind a real meta row.
  const meta = await getSnapshotMeta().catch(() => null);

  const hiringSlot = meta ? (
    <>
      <Hero />
      <Section01Shape />
      <Section02Demand />
      <Section03Shift />
      <Section04Profiles />
      <Section05Concurrency />
      <Section06Map />
      <Section07BuildBuy />
      <Section08Signal />
      <Section09Methodology />
      <Section10Roadmap />
    </>
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
