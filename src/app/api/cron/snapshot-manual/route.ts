/**
 * Human-triggered snapshot — same semantics as /api/cron/snapshot but intended
 * for first-deploy seeding and ad-hoc refresh. Uses the same CRON_SECRET.
 */
import { NextResponse, type NextRequest } from "next/server";
import { runSnapshot } from "@/lib/cron/run-snapshot";

export const runtime = "nodejs";
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
    { status: result.status === "success" ? 200 : 500 },
  );
}
