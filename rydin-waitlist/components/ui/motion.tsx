"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  type Transition,
  type Variants,
} from "framer-motion";
import { cn } from "@/lib/utils";

/* ================================================================== *
 * Motion vocabulary
 *
 * One set of spring presets for the whole page. Scattered ad-hoc easings
 * are what make a site feel assembled rather than designed, so every
 * transition on Rydin resolves to one of these.
 * ================================================================== */

/** Layout/among-siblings movement. Settles without visible overshoot. */
export const SPRING: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.9,
};

/** Tactile press/release on controls. Snappier, slightly springy. */
export const SPRING_TACTILE: Transition = {
  type: "spring",
  stiffness: 600,
  damping: 26,
  mass: 0.7,
};

/** Entrances and morphs. Longer, softer landing. */
export const SPRING_SOFT: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 30,
  mass: 1,
};

export const EASE_OUT: Transition = {
  duration: 0.5,
  ease: [0.22, 1, 0.36, 1],
};

/* ------------------------------------------------------------------ *
 * Reveal — scroll-triggered fade-in-up.
 * Fires once. Honours prefers-reduced-motion by rendering the resting
 * state immediately rather than animating a shorter distance.
 * ------------------------------------------------------------------ */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "span";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px -12% 0px" });
  const reduced = useReducedMotion();
  const MotionTag = motion[as] as typeof motion.div;

  if (reduced) {
    const Tag = as as "div";
    return (
      <Tag ref={ref} className={className}>
        {children}
      </Tag>
    );
  }

  return (
    <MotionTag
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ ...EASE_OUT, delay }}
    >
      {children}
    </MotionTag>
  );
}

/* ------------------------------------------------------------------ *
 * Stagger — a container whose children arrive in sequence.
 * ------------------------------------------------------------------ */
export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: EASE_OUT },
};

export function Stagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduced = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={staggerParent}
      initial={reduced ? "show" : "hidden"}
      animate={inView || reduced ? "show" : "hidden"}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={staggerChild} className={className}>
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 * AnimatedNumber — counts to a target when scrolled into view, then
 * tracks any later changes to `value` (the calculator relies on this).
 *
 * Rendered through `format` so Indian digit grouping and the ₹ symbol
 * stay the caller's decision.
 * ------------------------------------------------------------------ */
export function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  durationMs = 900,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  durationMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);
  const fromRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    if (!inView) return;

    const from = fromRef.current;
    const delta = value - from;
    if (delta === 0) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutExpo: fast commitment, gentle settle. Reads as a meter landing.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setDisplay(from + delta * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      fromRef.current = value;
    };
  }, [inView, value, durationMs, reduced]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)} data-numeric>
      {format(display)}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Tactile — press feedback for buttons and chips. Scale only; no shadow
 * animation, which is what makes cheap tactile effects look rubbery.
 * ------------------------------------------------------------------ */
export function Tactile({
  children,
  className,
  onClick,
  ariaLabel,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  ariaLabel?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      className={className}
      whileTap={disabled ? undefined : { scale: 0.975 }}
      transition={SPRING_TACTILE}
    >
      {children}
    </motion.button>
  );
}
