export function EmptyState() {
  return (
    <div className="panel p-8 text-center my-12 border-navy/10">
      <h2 className="font-serif text-xl mb-2">No snapshot yet</h2>
      <p className="text-sm text-muted mb-4 max-w-xl mx-auto">
        The classifier Lambda runs nightly at 02:00 UTC and populates the
        dashboard. To trigger an off-cycle run from your workstation:
      </p>
      <pre className="inline-block text-left text-xs bg-muted-soft px-4 py-3 rounded">
        bash infra/scripts/invoke-classifier-manual.sh
      </pre>
      <p className="mt-4 text-xs text-muted">
        Synchronous invocation returns in ~5 minutes; then reload this page.
      </p>
    </div>
  );
}
