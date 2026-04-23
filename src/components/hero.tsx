import { getSnapshotMeta } from "@/lib/data";

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

export async function Hero() {
  const meta = await getSnapshotMeta();
  const totalPostings = fmt(meta?.totalPostings);
  const digitalPostings = fmt(meta?.digitalPostings);

  return (
    <header className="pt-24">
      <div className="mx-auto max-w-column px-6">
        <h1 className="font-serif text-hero text-ink-primary tracking-tight">
          The UN system is competing with itself for digital talent
        </h1>
        <p className="mt-6 font-serif italic text-standfirst text-ink-muted">
          A classifier-measured read of {totalPostings} UN Common System
          postings in Q1 2026, covering {digitalPostings} digital roles across
          nine segments.
        </p>
        <p className="mt-8 text-[11px] uppercase tracking-[0.15em] text-ink-muted">
          UN Workforce Intelligence · Q1 2026 Digital Issue ·
          {" "}
          {formatDataAsOf(meta?.computedAt ?? null).replace(/^Data as of /, "")}
        </p>
        <div className="mt-8 h-[2px] w-full bg-highlight" />
        <p className="mt-8 font-serif text-[1.25rem] leading-[1.5] text-ink-primary">
          Every UN Common System agency of any size is hiring digital talent
          in Q1 2026. The problem is that many are hiring the same talent.
        </p>
      </div>
    </header>
  );
}
