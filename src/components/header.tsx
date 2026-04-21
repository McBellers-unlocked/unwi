import Link from "next/link";

function formatDataAsOf(iso: string | null): string {
  if (!iso) return "no snapshot yet";
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
  return `${date}, ${time} UTC`;
}

export function Header({ dataAsOfIso }: { dataAsOfIso: string | null }) {
  return (
    <header className="border-b border-panel-line bg-white sticky top-0 z-20">
      <div className="container flex items-center justify-between gap-6 py-4">
        <div>
          <h1 className="font-serif text-2xl leading-tight tracking-tight">
            UN Workforce Intelligence
          </h1>
          <p className="text-xs text-muted mt-0.5">
            System-level workforce analytics for UN80 and beyond
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-muted">
            Data as of
          </p>
          <p className="text-sm font-medium">{formatDataAsOf(dataAsOfIso)}</p>
          <Link
            href="/api/auth/logout"
            className="text-xs text-muted hover:text-un-blue mt-1 inline-block"
          >
            Sign out
          </Link>
        </div>
      </div>
    </header>
  );
}
