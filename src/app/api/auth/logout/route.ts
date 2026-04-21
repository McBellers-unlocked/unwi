import { NextResponse, type NextRequest } from "next/server";
import { getLogoutUrl } from "@/lib/cognito";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const url = getLogoutUrl(`${origin}/login`);
  const res = NextResponse.redirect(url);
  res.cookies.delete("unwi_id_token");
  return res;
}
