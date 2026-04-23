import { EmptyState } from "@/components/empty-state";
import { Hero } from "@/components/hero";
import { ScrollProgress } from "@/components/scroll-progress";
import { Section01Shape } from "@/components/sections/section-01-shape";
import { Section02Demand } from "@/components/sections/section-02-demand";
import { Section03Shift } from "@/components/sections/section-03-shift";
import { Section04Profiles } from "@/components/sections/section-04-profiles";
import { Section05Concurrency } from "@/components/sections/section-05-concurrency";
import { getSnapshotMeta } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function LongformPage() {
  const meta = await getSnapshotMeta();

  return (
    <>
      <ScrollProgress />
      <main className="min-h-screen bg-canvas text-ink-body pb-40">
        {!meta ? (
          <div className="pt-24 pb-16">
            <div className="mx-auto max-w-column px-6">
              <EmptyState />
            </div>
          </div>
        ) : (
          <>
            <Hero />
            <Section01Shape />
            <Section02Demand />
            <Section03Shift />
            <Section04Profiles />
            <Section05Concurrency />
          </>
        )}
      </main>
    </>
  );
}
