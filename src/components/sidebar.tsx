const SECTIONS = [
  { id: "section-1", label: "1. At-a-Glance", dim: false },
  { id: "section-2", label: "2. Where Demand Clusters", dim: false },
  { id: "section-3", label: "3. Quarter-on-Quarter Change", dim: false },
  { id: "section-4", label: "4. Role Collisions", dim: false },
  { id: "section-5", label: "5. Concurrent Hiring", dim: false },
  { id: "section-6", label: "6. Geographic Concentration", dim: false },
  { id: "section-7", label: "7. Staff vs Consultant", dim: false },
  { id: "section-8", label: "8. Forward Signal", dim: false },
  { id: "section-9", label: "9. Methodology", dim: false },
  { id: "section-10", label: "10. Coming Q3 2026", dim: true },
];

export function Sidebar() {
  return (
    <nav className="hidden lg:block w-64 shrink-0 sticky top-24 self-start">
      <ul className="space-y-1 text-sm">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={
                s.dim
                  ? "block px-3 py-1.5 rounded text-muted/60 hover:text-muted italic"
                  : "block px-3 py-1.5 rounded text-muted hover:bg-muted-soft hover:text-navy"
              }
            >
              {s.label}
              {s.dim && (
                <span className="ml-2 text-[10px] uppercase tracking-wider bg-muted-soft text-muted px-1.5 py-0.5 rounded">
                  preview
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
