import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Cron routes call the Supabase Edge Function at build-pull time; allow longer
  // server-action bodies since we return findings JSON for ad-hoc inspection.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      // Organization logos served by the Supabase aggregator. Wide pattern — v0.1
      // only renders org names, not logos; kept permissive for future use.
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
