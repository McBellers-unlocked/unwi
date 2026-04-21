/**
 * Cognito-gated middleware. Everything except /login, /api/cron/*, and
 * /api/auth/* requires a valid Cognito ID token cookie.
 *
 * v0.1 prototype scope: checks cookie presence + JWT exp. Full JWKS signature
 * verification deferred to Phase 2 — acceptable for a prototype behind a
 * private Cognito pool with no general public.
 */
import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "unwi_id_token";
const OPEN_PATHS = [
  "/login",
  "/api/cron", // cron endpoints protected by x-cron-secret, not session
  "/api/auth",
  "/_next",
  "/favicon",
];

function isOpen(pathname: string): boolean {
  return OPEN_PATHS.some((p) => pathname.startsWith(p));
}

function isJwtStillValid(token: string): boolean {
  try {
    const [, payload] = token.split(".");
    if (!payload) return false;
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { exp?: number };
    if (typeof decoded.exp !== "number") return false;
    // exp is seconds since epoch; add a 30s skew for clock drift.
    return decoded.exp * 1000 > Date.now() - 30_000;
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isOpen(pathname)) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token || !isJwtStillValid(token)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next internals; otherwise match every route.
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg).*)",
  ],
};
