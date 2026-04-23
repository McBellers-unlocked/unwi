import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // FT canvas
        canvas: "#FFF1E5",
        surface: "#FAEBDA",
        // Ink
        "ink-primary": "#0A3C5A",
        "ink-body": "#33302E",
        "ink-muted": "#66788A",
        // Data colours
        anchor: "#0A3C5A",
        highlight: "#00A0B0",
        claret: "#990F3D",
        // Lines
        rule: "#E5D9C8",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "-apple-system", "system-ui", "sans-serif"],
      },
      maxWidth: {
        column: "760px",
        wide: "1200px",
      },
      fontSize: {
        // Map against the spec. Values are in rem (16px base).
        "hero": ["3rem", { lineHeight: "1.05", fontWeight: "600" }],           // 48pt
        "section": ["2.25rem", { lineHeight: "1.15", fontWeight: "600" }],    // 36pt
        "chart-title": ["1.375rem", { lineHeight: "1.25", fontWeight: "600" }], // 22pt
        "feature": ["10rem", { lineHeight: "0.95", fontWeight: "400" }],      // 160pt
        "standfirst": ["1.25rem", { lineHeight: "1.45", fontWeight: "400" }], // 20pt
        "body": ["1rem", { lineHeight: "1.6", fontWeight: "400" }],           // 16pt
        "caption": ["0.8125rem", { lineHeight: "1.5", fontWeight: "400" }],   // 13pt
        "axis": ["0.75rem", { lineHeight: "1.4", fontWeight: "400" }],        // 12pt
        "annotation": ["0.8125rem", { lineHeight: "1.35", fontWeight: "500" }], // 13pt
      },
    },
  },
  plugins: [animate],
};

export default config;
