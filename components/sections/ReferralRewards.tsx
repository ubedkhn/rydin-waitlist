"use client";

import { motion } from "framer-motion";
import { Crown, Gift, Rocket, Trophy } from "lucide-react";
import { LEADERBOARD, QUEUE, REWARD_TIERS } from "@/lib/rydin/constants";
import { computeTierProgress, formatCount } from "@/lib/rydin/calc";
import { useWaitlist } from "@/components/waitlist/WaitlistProvider";
import { Reveal, SPRING, Stagger, StaggerItem } from "@/components/ui/motion";
import { SectionLabel } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const TIER_ICONS = [Rocket, Gift, Crown];

/**
 * Referral rewards + ambassador board.
 *
 * The progress rail reflects the reader's own referral count when they hold a
 * pass, so this section is a live view of their standing rather than a generic
 * marketing ladder.
 */
export function ReferralRewards() {
  const { pass, focusForm } = useWaitlist();
  const referrals = pass?.referrals ?? 0;
  const tiers = computeTierProgress(referrals);
  const maxReferrals = REWARD_TIERS[REWARD_TIERS.length - 1].referrals;

  return (
    <section id="rewards" className="relative px-4 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionLabel index="03" title="Move up the queue" />

        <Reveal>
          <h2 className="mt-6 max-w-2xl text-display-sm font-bold text-balance text-slate-900 dark:text-slate-50">
            Sharing a ride only works when you find people going your way.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            So inviting people on your corridor is the one thing that genuinely
            moves your launch date — and we pay you for it.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          {/* ---------- Tier ladder ---------- */}
          <Reveal className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 p-6 shadow-card sm:p-8">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {pass ? "Your progress" : "Reward ladder"}
              </p>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400" data-numeric>
                {referrals}/{maxReferrals} invites
              </p>
            </div>

            {/* Rail */}
            <div className="relative mt-4 h-2 rounded-full bg-slate-900/[0.08] dark:bg-slate-50/[0.08]">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                initial={{ width: 0 }}
                whileInView={{ width: `${tiers.percent}%` }}
                viewport={{ once: true }}
                transition={SPRING}
              />
            </div>

            {/* Steps */}
            <ol className="mt-7 space-y-4">
              {REWARD_TIERS.map((tier, i) => {
                const Icon = TIER_ICONS[i] ?? Gift;
                const reached = referrals >= tier.referrals;
                return (
                  <li key={tier.referrals} className="flex gap-4">
                    <span
                      className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset transition-colors",
                        reached
                          ? "bg-brand-500 text-white ring-brand-600/20"
                          : "bg-paper-sunken dark:bg-slate-800 text-slate-400 dark:text-slate-500 ring-slate-900/[0.08]",
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1 border-b border-slate-900/[0.06] dark:border-slate-50/[0.06] pb-4 last:border-0 last:pb-0">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">
                          {tier.referralLabel ?? `${tier.referrals} invite${tier.referrals === 1 ? "" : "s"}`}
                        </span>
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            reached ? "text-slate-900 dark:text-slate-50" : "text-slate-700 dark:text-slate-200",
                          )}
                        >
                          {tier.title}
                        </span>
                        {reached && (
                          <span className="rounded-full bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300 ring-1 ring-inset ring-brand-500/20 dark:ring-brand-500/30">
                            Unlocked
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {tier.detail}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-900/[0.07] dark:border-slate-50/[0.07] pt-5">
              <p className="font-mono text-xs text-gold-600">
                +{formatCount(QUEUE.spotsPerReferral)} spots per confirmed invite
              </p>
              {!pass && (
                <button
                  type="button"
                  onClick={focusForm}
                  className="ml-auto text-xs font-semibold text-brand-700 dark:text-brand-300 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-brand-500/60"
                >
                  Get your link →
                </button>
              )}
            </div>
          </Reveal>

          {/* ---------- Leaderboard ---------- */}
          <Reveal
            delay={0.08}
            className="rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 p-6 shadow-card sm:p-7"
          >
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-gold-500" strokeWidth={2.2} />
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Campus ambassadors
              </p>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Most invites this week
            </p>

            <Stagger className="mt-5 space-y-1">
              {LEADERBOARD.map((entry) => (
                <StaggerItem key={entry.rank}>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                      entry.rank === 1
                        ? "bg-gold-50 dark:bg-gold-500/10 ring-1 ring-inset ring-gold-400/30 dark:ring-gold-400/20"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-lg font-mono text-[11px] font-bold",
                        entry.rank === 1
                          ? "bg-gold-400 text-white"
                          : "bg-paper-sunken dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-1 ring-inset ring-slate-900/[0.06]",
                      )}
                    >
                      {entry.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {entry.handle}
                      </p>
                      <p className="truncate font-mono text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        {entry.affiliation}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className="font-mono text-xs font-semibold text-brand-700 dark:text-brand-300"
                        data-numeric
                      >
                        {entry.referrals}
                      </p>
                      <p
                        className="font-mono text-[10px] text-slate-400 dark:text-slate-500"
                        data-numeric
                      >
                        −{formatCount(entry.spotsSkipped)}
                      </p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>

            <p className="mt-5 border-t border-slate-900/[0.07] dark:border-slate-50/[0.07] pt-4 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
              Illustrative board for the preview. Live standings open with Batch 1.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
