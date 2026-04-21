const MODULES = [
  { id: "system-pulse", label: "1. System Pulse" },
  { id: "decentralisation", label: "2. Decentralisation Tracker" },
  { id: "duplication-radar", label: "3. Duplication Radar" },
  { id: "skills-heatmap", label: "4. Skills Heatmap" },
  { id: "agency-fingerprint", label: "5. Agency Fingerprint" },
  { id: "digital-talent", label: "6. Digital Talent" },
  { id: "forward-signal", label: "7. Forward Signal" },
];

export function Sidebar() {
  return (
    <nav className="hidden lg:block w-64 shrink-0 sticky top-24 self-start">
      <ul className="space-y-2 text-sm">
        {MODULES.map((m) => (
          <li key={m.id}>
            <a
              href={`#${m.id}`}
              className="block px-3 py-1.5 rounded hover:bg-muted-soft text-muted hover:text-ink"
            >
              {m.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
