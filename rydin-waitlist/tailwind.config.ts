import type { Config } from "tailwindcss";

/**
 * Rydin design tokens — Pristine Light.
 *
 * The palette is taken directly out of `public/rydin-logo.svg` so the page and
 * the mark cannot drift:
 *  - `brand.500` #05a47e — the logo's green. Trust and action.
 *  - `gold.400`  #faba10 — the logo's gold accent. Reserved *only* for wallet /
 *    referral economics, so money always reads as a different material.
 *
 * The ground is paper, not midnight: `paper.floor` (#F9FAFB, Tailwind's
 * gray-50) rising to pure white on every lifted surface. Depth comes from
 * shadow and a hairline slate ring, never from a darker fill — that is what
 * separates a light theme that looks designed from one that looks unstyled.
 *
 * Type is the one place this page departs from a default system stack:
 *  - `font-sans`    Geist          — display + body, tight tracking at large sizes
 *  - `font-mono`    Geist Mono     — every number on the page (fares, queue
 *                                    position, referral codes, route codes).
 *                                    Indian transit runs on printed numerals:
 *                                    fare meters, PNRs, ticket stubs. Numerics
 *                                    get the machine face; prose never does.
 */
const config: Config = {
  // Light mode is the only mode. No `dark:` variants are authored anywhere, so
  // the strategy is set to `class` and the class is simply never applied —
  // an OS in dark mode cannot flip this page half-way.
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Geist",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "Geist Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      colors: {
        /* The logo green, ramped. `500` is the mark's exact fill. */
        brand: {
          50: "#ECFDF6",
          100: "#D2F8E9",
          200: "#A8F0D5",
          300: "#6FE2BB",
          400: "#2ECC9E",
          500: "#05A47E",
          600: "#048A6A",
          700: "#046E56",
          800: "#065646",
          900: "#06473A",
        },
        /* The logo gold, ramped. Wallet / referral economics only. */
        gold: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FABA10",
          500: "#E0A406",
          600: "#B8830A",
          700: "#92670C",
        },
        /* Paper ground. `floor` is the page, `raise`/`lift` are surfaces. */
        paper: {
          floor: "#F9FAFB",
          raise: "#FFFFFF",
          lift: "#FFFFFF",
          sunken: "#F3F4F6",
        },
      },
      fontSize: {
        // Fluid display ramp. Hero headline never wraps awkwardly on a 360px phone
        // and never becomes a billboard on a 4K monitor.
        "display-sm": ["clamp(1.75rem, 1.2rem + 2.6vw, 2.75rem)", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        "display-md": ["clamp(2.25rem, 1.3rem + 4.4vw, 4rem)", { lineHeight: "1.02", letterSpacing: "-0.035em" }],
        "display-lg": ["clamp(2.75rem, 1.2rem + 6.6vw, 5.5rem)", { lineHeight: "0.98", letterSpacing: "-0.04em" }],
      },
      boxShadow: {
        /*
         * Light-mode elevation ladder. Two stacked shadows each: a tight
         * contact shadow that keeps the edge crisp, and a wide diffuse one that
         * does the lifting. A single large blur on white reads as grey haze.
         */
        card: "0 1px 2px 0 rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.10)",
        lift: "0 1px 2px 0 rgba(15,23,42,0.05), 0 18px 40px -18px rgba(15,23,42,0.16)",
        float: "0 2px 4px 0 rgba(15,23,42,0.05), 0 28px 60px -24px rgba(15,23,42,0.22)",
        /** Kept under the old name so nothing that references it breaks. */
        glass: "0 1px 2px 0 rgba(15,23,42,0.04), 0 18px 40px -18px rgba(15,23,42,0.14)",
        brand: "0 10px 30px -10px rgba(5,164,126,0.45)",
        "brand-sm": "0 6px 16px -6px rgba(5,164,126,0.40)",
        "inset-field": "inset 0 1px 2px 0 rgba(15,23,42,0.05)",
      },
      backgroundImage: {
        // Faint hairline grid: reads as a map graticule under the hero. Slate
        // rather than white, because on paper the lines have to be darker than
        // the ground, not lighter.
        graticule:
          "linear-gradient(to right, rgba(15,23,42,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.05) 1px, transparent 1px)",
      },
      backgroundSize: {
        // Named separately from the `graticule` image key: Tailwind derives both
        // background-image and background-size utilities from the `bg-` prefix,
        // so sharing a key would emit two rules under one class name.
        "grid-72": "72px 72px",
      },
      keyframes: {
        "orb-drift": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(0,-24px,0) scale(1.08)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(220%)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.85)", opacity: "0.75" },
          "80%, 100%": { transform: "scale(2.1)", opacity: "0" },
        },
        /*
         * Travelling road dashes. The translation MUST equal the period of the
         * repeating-linear-gradient in `.road-dash*` (18px mark + 16px gap =
         * 34px), or the loop visibly jumps on every restart.
         */
        "road-flow": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "34px 0" },
        },
      },
      animation: {
        "orb-drift": "orb-drift 14s ease-in-out infinite",
        shimmer: "shimmer 2.6s ease-in-out infinite",
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(0.24,0.6,0.36,1) infinite",
        "road-flow": "road-flow 3s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
