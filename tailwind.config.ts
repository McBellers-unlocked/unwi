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
        navy: "#0F2540",
        "navy-soft": "#1c3a63",
        teal: "#4DAFA8",
        "teal-soft": "#7dc6c0",
        slate: "#5A6C7D",
        ink: "#0F2540",
        muted: "#5A6C7D",
        "muted-soft": "#F5F7F8",
        "panel-line": "#e5e7eb",
        "takeaway-bg": "#F5F7F8",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [animate],
};

export default config;
