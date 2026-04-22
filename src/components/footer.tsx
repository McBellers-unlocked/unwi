export function Footer({
  dataAsOfText,
  classifierSha,
}: {
  dataAsOfText: string;
  classifierSha: string | null;
}) {
  const shaShort = classifierSha ? classifierSha.slice(0, 8) : null;
  return (
    <footer className="mt-16 border-t border-panel-line bg-white">
      <div className="container flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4 text-xs text-muted">
        <span>{dataAsOfText}</span>
        {shaShort && <span>Classifier v2 · SHA {shaShort}</span>}
        <span>Prototype — UNICC internal review only</span>
        <span>All metrics anchored to 2025-08-01</span>
      </div>
    </footer>
  );
}
