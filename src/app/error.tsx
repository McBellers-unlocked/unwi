"use client";

import { useEffect } from "react";

/**
 * App-level error boundary. Renders if any server component below
 * `app/` throws during the render. Keeps the canvas + brand consistent
 * and points users to the static benchmarking view (which doesn't
 * touch the database) so the site stays usable while the underlying
 * issue is being fixed.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-canvas text-ink-body">
      <div className="mx-auto max-w-column px-6 pt-24 pb-16">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          Site status
        </p>
        <h1 className="mt-4 font-serif text-section text-ink-primary tracking-tight">
          Live data is temporarily unavailable.
        </h1>
        <p className="mt-4 font-serif italic text-standfirst text-ink-muted">
          The classifier-fed sections of the dashboard couldn&rsquo;t render.
          The strategic benchmarking analysis is unaffected and remains
          available below.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 text-[13px] font-medium border border-ink-muted/40 text-ink-primary hover:border-highlight hover:text-highlight transition-colors"
          >
            Retry
          </button>
          <a
            href="/"
            className="px-4 py-2 text-[13px] font-medium bg-highlight text-white hover:bg-highlight/90 transition-colors"
          >
            View benchmarking analysis
          </a>
        </div>

        {error.digest && (
          <p className="mt-12 text-[12px] text-ink-muted font-mono">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
