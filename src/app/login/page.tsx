import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getHostedLoginUrl } from "@/lib/cognito";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string; auto?: string }>;
}) {
  const sp = await searchParams;
  // If the user landed here via middleware redirect we trigger hosted-login
  // automatically. On explicit /login navigation without ?auto, show a page.
  if (sp.auto === "1" || sp.from) {
    const h = await headers();
    const origin =
      process.env.NEXT_PUBLIC_BASE_URL ??
      `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
    const redirectUri = `${origin}/api/auth/callback`;
    redirect(getHostedLoginUrl(redirectUri, sp.from ?? "/"));
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white text-navy">
      <div className="w-full max-w-md text-center">
        <h1 className="font-serif text-3xl leading-tight text-navy">
          UN Workforce Intelligence
        </h1>
        <p className="text-teal mt-2 text-xs uppercase tracking-wider font-medium">
          Q1 2026 Digital Issue
        </p>
        <div className="mt-10">
          <Link
            href="/login?auto=1"
            className="inline-flex items-center justify-center h-10 px-5 rounded-md bg-navy text-white font-medium hover:bg-navy-soft transition-colors"
          >
            Sign in
          </Link>
          {sp.error ? (
            <p className="mt-4 text-sm text-red-600">Error: {sp.error}</p>
          ) : null}
        </div>
        <footer className="mt-14 text-xs text-muted">
          A UNICC prototype. Not for external distribution.
        </footer>
      </div>
    </main>
  );
}
