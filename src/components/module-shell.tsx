import type { ReactNode } from "react";

export function ModuleShell({
  id,
  title,
  headline,
  micro,
  children,
}: {
  id: string;
  title: string;
  headline?: ReactNode;
  micro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="module-anchor py-10 border-b border-panel-line">
      <div className="flex items-baseline justify-between gap-6 mb-4">
        <h2 className="font-serif text-xl">{title}</h2>
        {headline ? <div className="text-sm text-muted">{headline}</div> : null}
      </div>
      <div>{children}</div>
      {micro ? (
        <p className="mt-6 text-sm text-muted max-w-3xl italic">
          {micro}
        </p>
      ) : null}
    </section>
  );
}

export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="panel p-5">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="stat-value mt-2 text-ink">{value}</p>
      {sub ? <p className="text-xs text-muted mt-1">{sub}</p> : null}
    </div>
  );
}
