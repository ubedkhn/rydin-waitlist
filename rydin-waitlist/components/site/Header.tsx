"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Search } from "lucide-react";
import { PulseDot, Wordmark } from "@/components/ui/primitives";
import { SpotLookupModal } from "@/components/waitlist/SpotLookupModal";
import { SPRING, Tactile } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

/**
 * Site header.
 *
 * Floats over the graticule and tightens once the reader leaves the hero — the
 * bar gains an opaque white fill and a shadow and loses a little height, which
 * is what makes a fixed header feel attached to the page rather than parked on
 * it. Over the hero it stays transparent so the graticule reads through.
 */
export function Header() {
  const [lookupOpen, setLookupOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
        <motion.div
          initial={false}
          animate={
            reduced
              ? undefined
              : { paddingTop: scrolled ? 8 : 10, paddingBottom: scrolled ? 8 : 10 }
          }
          transition={SPRING}
          className={cn(
            "mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-2xl px-3 backdrop-blur-xl transition-colors sm:px-4",
            scrolled
              ? "bg-white/90 shadow-lift ring-hairline"
              : "bg-transparent",
          )}
        >
          <a
            href="#top"
            className="rounded-lg focus-visible:ring-2 focus-visible:ring-brand-500/60"
            aria-label="Rydin — home"
          >
            <Wordmark />
          </a>

          {/* Live network status. Repeated in the hero eyebrow for small screens. */}
          <div className="hidden items-center gap-2 rounded-full bg-white px-3.5 py-1.5 shadow-card ring-hairline md:inline-flex">
            <PulseDot />
            <span className="text-xs font-medium text-slate-700">
              Beta Launch: MP Corridor
            </span>
            <span className="h-3 w-px bg-slate-900/10" aria-hidden="true" />
            <span className="text-xs text-slate-500">Batch 1 opening soon</span>
          </div>

          <Tactile
            onClick={() => setLookupOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-medium text-slate-800 shadow-card ring-hairline transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand-500/60"
          >
            <Search className="h-4 w-4 text-brand-600" strokeWidth={2.2} />
            <span className="hidden sm:inline">Check my spot</span>
            <span className="sm:hidden">My spot</span>
          </Tactile>
        </motion.div>
      </header>

      <SpotLookupModal open={lookupOpen} onClose={() => setLookupOpen(false)} />
    </>
  );
}
