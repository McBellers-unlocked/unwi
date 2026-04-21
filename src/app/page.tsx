import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { EmptyState } from "@/components/empty-state";
import { SystemPulse } from "@/components/modules/system-pulse";
import { Decentralisation } from "@/components/modules/decentralisation";
import { DuplicationRadar } from "@/components/modules/duplication-radar";
import { SkillsHeatmap } from "@/components/modules/skills-heatmap";
import { AgencyFingerprint } from "@/components/modules/agency-fingerprint";
import { DigitalTalent } from "@/components/modules/digital-talent";
import { ForwardSignal } from "@/components/modules/forward-signal";
import {
  getLatestDailySnapshot,
  getLatestAgencySnapshots,
  getLatestSuccessfulRunAt,
} from "@/lib/db/repo";

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
  const [snapshot, agencies, runAt] = await Promise.all([
    getLatestDailySnapshot(),
    getLatestAgencySnapshots(),
    getLatestSuccessfulRunAt(),
  ]);

  return (
    <div className="min-h-screen bg-white">
      <Header dataAsOfIso={runAt} />
      <div className="container py-8">
        <div className="flex gap-10">
          <Sidebar />
          <main className="flex-1 min-w-0">
            {!snapshot ? (
              <EmptyState />
            ) : (
              <>
                <SystemPulse
                  system={snapshot.rawMetrics.system}
                  ytdAnchor={
                    snapshot.rawMetrics.digitalTalent.ytdAnchor ?? "2025-08-01"
                  }
                />
                <Decentralisation data={snapshot.rawMetrics.decentralisation} />
                <DuplicationRadar data={snapshot.rawMetrics.duplication} />
                <SkillsHeatmap data={snapshot.rawMetrics.skills} />
                <AgencyFingerprint agencies={agencies} />
                <DigitalTalent data={snapshot.rawMetrics.digitalTalent} />
                <ForwardSignal data={snapshot.rawMetrics.forwardSignal} />
              </>
            )}
          </main>
        </div>
      </div>
      <Footer dataAsOfText={formatDataAsOf(runAt)} />
    </div>
  );
}
