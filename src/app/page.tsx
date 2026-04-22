import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { EmptyState } from "@/components/empty-state";
import { Section01Cover } from "@/components/sections/section-01-cover";
import { Section02DemandClusters } from "@/components/sections/section-02-demand-clusters";
import { Section03QoQChange } from "@/components/sections/section-03-qoq-change";
import { Section04CollisionProfiles } from "@/components/sections/section-04-collision-profiles";
import { Section05Concurrency } from "@/components/sections/section-05-concurrency";
import { Section06Geography } from "@/components/sections/section-06-geography";
import { Section07StaffVsConsultant } from "@/components/sections/section-07-staff-vs-consultant";
import { Section08ForwardSignal } from "@/components/sections/section-08-forward-signal";
import { Section09Methodology } from "@/components/sections/section-09-methodology";
import { Section10Roadmap } from "@/components/sections/section-10-roadmap";
import { getSnapshotMeta } from "@/lib/data";

export const dynamic = "force-dynamic";

function formatDataAsOf(iso: string | null): string {
  if (!iso) return "Data as of: no snapshot yet";
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  return `Data as of ${date}, ${time} UTC`;
}

export default async function DashboardPage() {
  const meta = await getSnapshotMeta();

  return (
    <div className="min-h-screen bg-white">
      <Header dataAsOfIso={meta?.computedAt ?? null} />
      <div className="container py-8">
        <div className="flex gap-10">
          <Sidebar />
          <main className="flex-1 min-w-0 space-y-0">
            {!meta ? (
              <EmptyState />
            ) : (
              <>
                <Section01Cover />
                <Section02DemandClusters />
                <Section03QoQChange />
                <Section04CollisionProfiles />
                <Section05Concurrency />
                <Section06Geography />
                <Section07StaffVsConsultant />
                <Section08ForwardSignal />
                <Section09Methodology />
                <Section10Roadmap />
              </>
            )}
          </main>
        </div>
      </div>
      <Footer
        dataAsOfText={formatDataAsOf(meta?.computedAt ?? null)}
        classifierSha={meta?.classifierVersionSha ?? null}
      />
    </div>
  );
}
