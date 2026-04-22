import type { ReactNode } from "react";

export function SectionShell({
  id,
  number,
  title,
  subtitle,
  takeaway,
  children,
  variant = "default",
}: {
  id: string;
  number: number;
  title: string;
  subtitle?: string;
  takeaway?: ReactNode;
  children: ReactNode;
  variant?: "default" | "navy" | "dim";
}) {
  const shellBg =
    variant === "navy"
      ? "bg-navy text-white"
      : variant === "dim"
        ? "bg-muted-soft"
        : "bg-white";
  const numCol =
    variant === "navy" ? "text-teal" : "text-teal";
  const titleCol = variant === "navy" ? "text-white" : "text-navy";
  const subCol = variant === "navy" ? "text-teal-soft" : "text-muted";

  return (
    <section
      id={id}
      className={`module-anchor py-12 border-b border-panel-line ${shellBg}`}
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="flex items-baseline gap-4 mb-2">
            <span className={`font-serif text-sm tracking-wider ${numCol}`}>
              {String(number).padStart(2, "0")}
            </span>
            <h2 className={`font-serif text-2xl tracking-tight ${titleCol}`}>
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className={`text-sm mb-6 ${subCol}`}>{subtitle}</p>
          )}
          <div>{children}</div>
        </div>
        {takeaway && (
          <aside className="lg:w-72 shrink-0">
            <div className="bg-takeaway-bg p-5 rounded-md border border-panel-line sticky top-24">
              <p className="text-xs uppercase tracking-wider text-teal font-semibold mb-3">
                Takeaway
              </p>
              <div className="text-sm text-navy space-y-2 leading-relaxed">
                {takeaway}
              </div>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}

export function DecisionBar({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 bg-navy text-white px-6 py-4 rounded-md flex items-start gap-4">
      <span className="text-teal font-semibold uppercase text-xs tracking-wider shrink-0">
        Decision implication
      </span>
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  );
}

export function StatTile({
  value,
  label,
  sub,
}: {
  value: ReactNode;
  label: string;
  sub?: ReactNode;
}) {
  return (
    <div className="panel p-5">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="stat-value mt-2 text-navy">{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}
