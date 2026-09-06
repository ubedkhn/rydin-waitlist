"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { FAQS, SOCIAL, SUPPORT_EMAIL } from "@/lib/rydin/constants";
import { EASE_OUT, Reveal, SPRING } from "@/components/ui/motion";
import { SectionLabel } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/** The prepared `mailto:` from constants, so the subject line matches the footer's. */
const SUPPORT_HREF =
  SOCIAL.find((s) => s.id === "email")?.href ?? `mailto:${SUPPORT_EMAIL}`;

/**
 * FAQ accordion.
 *
 * Single-open, because these answers are long enough that two expanded at once
 * pushes the third off screen and the reader loses their place. The plus rotates
 * to a minus rather than swapping glyphs — one element, so it can actually
 * animate.
 */
export function FaqAccordion() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative px-4 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-3xl">
        <SectionLabel index="04" title="Straight answers" />

        <Reveal>
          <h2 className="mt-6 text-display-sm font-bold text-balance text-slate-900 dark:text-slate-50">
            The questions people actually ask.
          </h2>
        </Reveal>

        <div className="mt-10 divide-y divide-slate-900/[0.07] overflow-hidden rounded-3xl bg-paper-raise dark:bg-slate-900 shadow-card ring-hairline">
          {FAQS.map((faq, i) => {
            const expanded = open === i;
            const panelId = `faq-panel-${i}`;
            const buttonId = `faq-button-${i}`;

            return (
              <div key={faq.question}>
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => setOpen(expanded ? null : i)}
                    className="flex w-full items-start gap-4 px-5 py-5 text-left transition-colors hover:bg-slate-50 dark:bg-slate-800/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/60 sm:px-7 sm:py-6"
                  >
                    <span className="mt-0.5 font-mono text-[11px] font-semibold text-brand-600 dark:text-brand-400">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={cn(
                        "flex-1 text-[15px] font-semibold leading-snug transition-colors",
                        expanded ? "text-slate-900 dark:text-slate-50" : "text-slate-700 dark:text-slate-200",
                      )}
                    >
                      {faq.question}
                    </span>
                    <motion.span
                      aria-hidden="true"
                      animate={{ rotate: expanded ? 135 : 0 }}
                      transition={SPRING}
                      className={cn(
                        "mt-px grid h-7 w-7 shrink-0 place-items-center rounded-full ring-1 ring-inset transition-colors",
                        expanded
                          ? "bg-brand-500 text-white ring-brand-600/20"
                          : "bg-paper-sunken dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-slate-900/[0.08]",
                      )}
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.4} />
                    </motion.span>
                  </button>
                </h3>

                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={EASE_OUT}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-6 pl-[3.1rem] text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:px-7 sm:pb-7 sm:pl-[4rem]">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <Reveal delay={0.1}>
          <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Something still unclear?{" "}
            <a
              href={SUPPORT_HREF}
              className="font-medium text-brand-700 dark:text-brand-300 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-brand-500/60"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
