import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1440px" },
    },
    extend: {
      colors: {
        // UN blue per brand spec
        "un-blue": "#009EDB",
        "un-blue-dark": "#007AA3",
        ink: "#1a1f2e",
        muted: "#64748b",
        "muted-soft": "#f1f5f9",
        "panel-line": "#e5e7eb",
      },
      fontFamily: {
        // Serif for headings, sans for body. Loaded via next/font in layout.tsx.
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [animate],
};

export default config;
