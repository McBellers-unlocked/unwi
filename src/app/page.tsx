import { EmptyState } from "@/components/empty-state";
import { Hero } from "@/components/hero";
import { ScrollProgress } from "@/components/scroll-progress";
import { Section01Shape } from "@/components/sections/section-01-shape";
import { getSnapshotMeta } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function LongformPage() {
  const meta = await getSnapshotMeta();

  return (
    <>
      <ScrollProgress />
      <main className="min-h-screen bg-canvas text-ink-body">
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
          </>
        )}
      </main>
    </>
  );
}
