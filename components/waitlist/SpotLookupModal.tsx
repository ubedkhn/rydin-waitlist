"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader, Search, X } from "lucide-react";
import { computeStanding, formatCount } from "@/lib/rydin/calc";
import type { QueuePassRecord } from "@/lib/rydin/types";
import { useWaitlist } from "@/components/waitlist/WaitlistProvider";
import { SPRING_SOFT, Tactile } from "@/components/ui/motion";

/**
 * Spot lookup — find an existing pass by the email it was created with.
 *
 * Email, because that is the field the backend indexes and the only identifier
 * the form now collects that is unique. The lookup asks the server first and
 * falls back to this browser's stored pass, and the empty state says which of
 * those actually happened rather than implying a database was searched.
 */
export function SpotLookupModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { lookup, focusForm } = useWaitlist();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<QueuePassRecord | null>(null);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);

  // Reset on open so a previous search never leaks into a new one.
  useEffect(() => {
    if (open) {
      setQuery("");
      setResult(null);
      setSearched(false);
      setBusy(false);
    }
  }, [open]);

  // Escape to dismiss, and lock the page behind the sheet.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      setResult(await lookup(query));
      setSearched(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/*
            Scrim. On a light page a black scrim is far too heavy — slate at 45%
            with a blur reads as the page being set behind glass instead of
            switched off.
          */}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lookup-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={SPRING_SOFT}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-paper-raise dark:bg-slate-900 p-5 shadow-float ring-hairline sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="lookup-title" className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Check your spot
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Enter the email address you joined with.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-700 dark:text-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                <X className="h-4 w-4" strokeWidth={2.3} />
              </button>
            </div>

            <div className="mt-5 flex items-stretch gap-2">
              <input
                autoFocus
                type="email"
                inputMode="email"
                autoComplete="email"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearched(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void run();
                }}
                placeholder="you@college.edu"
                className="w-full rounded-xl bg-paper-sunken dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:text-slate-500 ring-hairline-strong focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Tactile
                onClick={run}
                disabled={busy}
                ariaLabel="Search"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 px-4 text-sm font-semibold text-white shadow-brand-sm focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-80"
              >
                {busy ? (
                  <Loader className="h-4 w-4 animate-spin" strokeWidth={2.4} />
                ) : (
                  <Search className="h-4 w-4" strokeWidth={2.4} />
                )}
                Find
              </Tactile>
            </div>

            <AnimatePresence mode="wait">
              {searched && result && (
                <motion.div
                  key="found"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-xl bg-brand-50 dark:bg-brand-500/10 p-4 ring-1 ring-inset ring-brand-500/20 dark:ring-brand-500/30"
                >
                  <p className="text-xs font-medium text-brand-700 dark:text-brand-300">
                    {result.username || result.email}
                    {result.routeCode ? ` · ${result.routeCode}` : ""}
                  </p>
                  <p
                    className="mt-1 font-mono text-3xl font-bold text-slate-900 dark:text-slate-50"
                    data-numeric
                  >
                    #{formatCount(computeStanding(result).currentPosition)}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    Pass {result.passId}
                  </p>
                </motion.div>
              )}

              {searched && !result && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-xl bg-paper-sunken dark:bg-slate-800 p-4 ring-hairline"
                >
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    Nothing found for that address.
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    Check the spelling. If the queue server is unreachable we can
                    only find a pass created in this browser, so one made on
                    another device won&apos;t appear here.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      focusForm();
                    }}
                    className="mt-3 text-xs font-semibold text-brand-700 dark:text-brand-300 underline-offset-4 hover:underline focus-visible:ring-0 focus-visible:ring-offset-0"
                  >
                    Join the waitlist instead →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
