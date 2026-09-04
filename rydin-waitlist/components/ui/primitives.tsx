import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ================================================================== *
 * Static presentational primitives.
 *
 * No framer-motion, no client state. These are pure server components:
 * structure, paper surfaces, and the road/transit vernacular that gives
 * Rydin its identity.
 * ================================================================== */

/* ------------------------------------------------------------------ *
 * Panel — the lifted paper surface used across the page.
 *
 * On a near-white ground a card cannot be defined by a lighter fill, so
 * separation comes from three things at once: pure white against the
 * gray-50 floor, a hairline slate ring drawn inset, and a two-stage
 * shadow. Exported as `GlassPanel` too, since that is the name the rest
 * of the page already imports.
 * ------------------------------------------------------------------ */
export function GlassPanel({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "aside";
}) {
  return (
    <Tag
      className={cn(
        "relative rounded-3xl bg-paper-raise shadow-card ring-hairline",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ *
 * PulseDot — a live status indicator. The expanding ring is pure CSS
 * (defined in tailwind.config keyframes) and is silenced by
 * prefers-reduced-motion via the global media query.
 * ------------------------------------------------------------------ */
export function PulseDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex h-2.5 w-2.5", className)}>
      <span className="absolute inset-0 rounded-full bg-brand-500/60 animate-pulse-ring" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-500 shadow-[0_0_0_3px_rgba(5,164,126,0.14)]" />
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Eyebrow — a pill above a headline. Renders arbitrary nodes so the hero
 * can drop dots and accents between phrases.
 * ------------------------------------------------------------------ */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-paper-raise px-3.5 py-1.5",
        "text-xs font-medium text-slate-600 shadow-card ring-hairline",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A quiet interpunct for separating eyebrow phrases. */
export function Dot() {
  return (
    <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden="true" />
  );
}

/* ------------------------------------------------------------------ *
 * SectionLabel — the structural device. A mono index + a dashed road
 * rule. Numbers here are real: sections are read top to bottom, so the
 * count encodes order the reader is actually moving through.
 * ------------------------------------------------------------------ */
export function SectionLabel({
  index,
  title,
  className,
}: {
  index: string;
  title: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <span className="font-mono text-xs tracking-widest text-brand-600">
        {index}
      </span>
      <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
        {title}
      </span>
      <span className="h-px flex-1 road-dash-muted" aria-hidden="true" />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * RoadDivider — a full-width dashed centreline. Reused between sections
 * so the whole page reads as one continuous corridor.
 * ------------------------------------------------------------------ */
export function RoadDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn("mx-auto h-px w-full max-w-6xl", className)}
      aria-hidden="true"
    >
      <div className="h-px w-full road-dash-muted animate-road-flow opacity-70" />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * GlowOrb — ambient bloom behind hero/feature surfaces. Drifts on a long
 * CSS loop; decorative only, so aria-hidden.
 *
 * On paper a glow has to be a *tint*, not a light source: alpha drops to
 * around 10% so it reads as ink bleeding into the page rather than a
 * lamp shining through it.
 * ------------------------------------------------------------------ */
export function GlowOrb({
  className,
  tone = "emerald",
}: {
  className?: string;
  /** `emerald` keeps the old call sites working; both map to brand tokens. */
  tone?: "emerald" | "amber";
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute rounded-full blur-3xl animate-orb-drift",
        tone === "emerald" ? "bg-brand-300/25" : "bg-gold-300/20",
        className,
      )}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Wordmark — the brand lockup.
 *
 * This is the SVG shipped in `public/rydin-logo.svg`, not type set in
 * Geist. A wordmark rendered as live text drifts from the real asset the
 * moment either changes, so there is exactly one file and every surface
 * points at it.
 *
 * `width`/`height` are declared to reserve the box before the SVG lands —
 * a logo in the header is the first thing on the page and must not shift
 * the nav when it paints. The asset's viewBox is already cropped to the
 * lockup, so height alone controls the size.
 * ------------------------------------------------------------------ */
export function Wordmark({ className }: { className?: string }) {
  return (
    <img
      src="/rydin-logo.svg"
      alt="Rydin"
      width={125}
      height={36}
      decoding="async"
      className={cn(
        "h-9 w-auto select-none rounded-[10px] shadow-brand-sm",
        className,
      )}
    />
  );
}

/* ------------------------------------------------------------------ *
 * StatChip — a small mono figure with a label. The number is set in
 * Geist Mono with tabular figures so it reads as instrument data.
 * ------------------------------------------------------------------ */
export function StatChip({
  value,
  label,
  tone = "default",
}: {
  value: string;
  label: string;
  tone?: "default" | "emerald" | "amber";
}) {
  const valueTone =
    tone === "emerald"
      ? "text-brand-700"
      : tone === "amber"
        ? "text-gold-600"
        : "text-slate-900";
  return (
    <div className="flex flex-col">
      <span
        className={cn("font-mono text-sm font-semibold", valueTone)}
        data-numeric
      >
        {value}
      </span>
      <span className="mt-0.5 text-[11px] text-slate-500">{label}</span>
    </div>
  );
}
