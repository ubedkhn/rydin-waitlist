"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowUp, Ticket } from "lucide-react";
import { formatCount } from "@/lib/rydin/calc";
import { useWaitlist } from "@/components/waitlist/WaitlistProvider";
import { SPRING_SOFT, Tactile } from "@/components/ui/motion";

/**
 * Sticky bottom CTA.
 *
 * Appears once the hero widget has scrolled out of reach and hides again on
 * return, so it never competes with the card it points at. Reads the shared
 * waitlist state, so after joining it switches from "join" to "view your pass"
 * instead of asking someone to sign up twice.
 */
export function StickyCta() {
  const { pass, standing, telemetry, focusForm } = useWaitlist();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById("waitlist");
    if (!target) return;

    // Show the bar only while the widget is off-screen.
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { rootMargin: "-72px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 88, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 88, opacity: 0 }}
          transition={SPRING_SOFT}
          className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-5 sm:pb-4"
        >
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 px-4 py-3 shadow-float ring-hairline backdrop-blur-xl">
            <div className="min-w-0">
              {pass && standing ? (
                <>
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                    You&apos;re{" "}
                    <span className="font-mono text-brand-700 dark:text-brand-300" data-numeric>
                      #{formatCount(standing.currentPosition)}
                    </span>{" "}
                    in line
                  </p>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    Invite peers to move up the queue
                  </p>
                </>
              ) : (
                <>
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                    Join{" "}
                    <span className="font-mono text-brand-700 dark:text-brand-300" data-numeric>
                      {formatCount(telemetry.commuters)}
                    </span>{" "}
                    peers skipping surge pricing
                  </p>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    Batch 1 opens on the MP corridor
                  </p>
                </>
              )}
            </div>

            <Tactile
              onClick={focusForm}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-brand-sm focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {pass ? (
                <>
                  <Ticket className="h-4 w-4" strokeWidth={2.3} />
                  <span className="hidden sm:inline">View pass</span>
                  <span className="sm:hidden">Pass</span>
                </>
              ) : (
                <>
                  <ArrowUp className="h-4 w-4" strokeWidth={2.4} />
                  Join waitlist
                </>
              )}
            </Tactile>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
