import type { Metadata, Viewport } from "next";
import { Source_Serif_4, Inter } from "next/font/google";
import "./globals.css";

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "600", "700"],
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "UN Workforce Intelligence",
  description:
    "System-level workforce analytics for UN80 and beyond. A UNICC prototype.",
  icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }],
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0F2540",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
