export function Footer({ dataAsOfText }: { dataAsOfText: string }) {
  return (
    <footer className="mt-16 border-t border-panel-line bg-white">
      <div className="container flex items-center justify-between py-4 text-xs text-muted">
        <span>Prototype — UNICC internal review only</span>
        <span>{dataAsOfText}</span>
      </div>
    </footer>
  );
}
