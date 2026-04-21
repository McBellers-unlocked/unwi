"use client";
import { useState } from "react";

export function EmptyState() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function runSnapshot() {
    setLoading(true);
    setError(null);
    try {
      // The manual cron endpoint needs the secret header. We can't expose the
      // secret to the browser; the dev operator pastes it here once to seed.
      const secret = window.prompt(
        "Paste CRON_SECRET to trigger the first snapshot:",
      );
      if (!secret) {
        setLoading(false);
        return;
      }
      const res = await fetch("/api/cron/snapshot-manual", {
        method: "POST",
        headers: { "x-cron-secret": secret },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setDone(true);
      // Hard reload so server components re-read Aurora.
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel p-8 text-center my-12">
      <h2 className="font-serif text-xl mb-2">No snapshot yet</h2>
      <p className="text-sm text-muted mb-6">
        Trigger the first snapshot to populate the dashboard. Pull + compute
        takes ~30 seconds on ~15,000 postings.
      </p>
      <button
        onClick={runSnapshot}
        disabled={loading || done}
        className="inline-flex items-center justify-center h-10 px-5 rounded-md bg-un-blue text-white font-medium hover:bg-un-blue-dark disabled:opacity-60"
      >
        {loading ? "Running…" : done ? "Done — reloading" : "Run first snapshot"}
      </button>
      {error ? (
        <p className="mt-4 text-sm text-red-600">Error: {error}</p>
      ) : null}
    </div>
  );
}
