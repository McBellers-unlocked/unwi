import { getSnapshotMeta } from "@/lib/data";
import { getPeriodCopy, type WindowKey } from "@/lib/window";

function formatDataAsOf(iso: string | null): string {
  if (!iso) return "Data as of: pending first snapshot";
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

function fmt(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString("en-GB");
}

export async function Hero({ window = "q1" }: { window?: WindowKey } = {}) {
  const meta = await getSnapshotMeta();
  const totalPostings = fmt(meta?.totalPostings);
  const digitalPostings = fmt(meta?.digitalPostings);
  const copy = getPeriodCopy(window);

  return (
    <header className="pt-24">
      <div className="mx-auto max-w-column px-6">
        <h1 className="font-serif text-hero text-ink-primary tracking-tight">
          The UN system is competing
          <br />
          with itself for digital talent
        </h1>
        <p className="mt-6 font-serif italic text-standfirst text-ink-muted">
          A classifier-measured read of {totalPostings} UN Common System
          postings {copy.heroStandfirst} {digitalPostings} digital roles across
          nine segments.
        </p>
        <p className="mt-8 text-[11px] uppercase tracking-[0.15em] text-ink-muted">
          UN Workforce Intelligence · {copy.badge} ·
          {" "}
          {formatDataAsOf(meta?.computedAt ?? null).replace(/^Data as of /, "")}
        </p>
        <div className="mt-8 h-[2px] w-full bg-highlight" />
        <p className="mt-8 font-serif text-[1.25rem] leading-[1.5] text-ink-primary">
          Every UN Common System agency of any size is hiring digital talent
          {" "}{copy.heroCloser}. The problem is that many are hiring the same talent.
        </p>
      </div>
    </header>
  );
}
