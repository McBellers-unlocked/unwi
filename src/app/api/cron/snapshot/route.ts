/**
 * Nightly cron endpoint — called by EventBridge / Amplify scheduler at 02:00 UTC.
 * Requires header `x-cron-secret: $CRON_SECRET` to prevent abuse.
 */
import { NextResponse, type NextRequest } from "next/server";
import { runSnapshot } from "@/lib/cron/run-snapshot";

export const runtime = "nodejs";
// Snapshot pull + compute takes ~30s on ~15k rows; default 10s is too low.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not set on server" },
      { status: 500 },
    );
  }
  if (req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runSnapshot();
  // Return status 200 for success, 500 for failure so EventBridge retries visibly.
  const status = result.status === "success" ? 200 : 500;
  // Strip the large findings blob from the HTTP response — it's already in
  // the DB. Returning the summary keeps the response log-friendly.
  return NextResponse.json(
    {
      runId: result.runId,
      status: result.status,
      rowsFetched: result.rowsFetched,
      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
      backfilledHistoryRows: result.backfilledHistoryRows,
      error: result.error,
    },
    { status },
  );
}
