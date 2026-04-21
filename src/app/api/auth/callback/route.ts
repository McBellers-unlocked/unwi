import { NextResponse, type NextRequest } from "next/server";
import { exchangeCodeForTokens } from "@/lib/cognito";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const returnTo = req.nextUrl.searchParams.get("state") ?? "/";
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", req.url));
  }

  try {
    const origin = req.nextUrl.origin;
    const redirectUri = `${origin}/api/auth/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    const res = NextResponse.redirect(new URL(returnTo, req.url));
    res.cookies.set("unwi_id_token", tokens.id_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: tokens.expires_in,
    });
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "auth_failed";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, req.url),
    );
  }
}
