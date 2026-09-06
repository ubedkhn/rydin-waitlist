"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  Copy,
  Share2,
  Ticket,
  TrendingUp,
  UserPlus,
  WifiOff,
} from "lucide-react";
import { REWARD_TIERS, QUEUE } from "@/lib/rydin/constants";
import {
  buildReferralLink,
  computeTierProgress,
  formatCount,
  maskEmail,
  passIssuedOn,
} from "@/lib/rydin/calc";
import type { QueuePassRecord } from "@/lib/rydin/types";
import type { QueueStanding } from "@/lib/rydin/calc";
import { SPRING, SPRING_SOFT, Tactile } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

/* ================================================================== *
 * QueuePass — the signature object.
 *
 * Not a success card. A torn ticket: two punched notches at the tear
 * line, a perforated rule between them, mono numerals throughout, and a
 * serial you could read down a phone line. Indian transit runs on
 * printed stubs — bus tickets, railway PNRs — so the payoff moment for
 * a mobility waitlist should feel like holding one.
 *
 * On paper the ticket is the whitest thing on the page and the floor
 * shows through the punched notches, which is what makes the tear read
 * as a physical edge rather than a drawn line.
 * ================================================================== */

export function QueuePass({
  pass,
  standing,
  onAddReferral,
  onReset,
}: {
  pass: QueuePassRecord;
  standing: QueueStanding;
  onAddReferral: () => void;
  onReset: () => void;
}) {
  /* Always `https://rydinapp.com/r/<code>` — built from BRAND.shareOrigin. */
  const link = buildReferralLink(pass.referralCode);
  const tiers = computeTierProgress(pass.referrals);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(t);
  }, [copied]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // Clipboard denied (insecure origin, or an older browser). Select the
      // text instead so copying by hand is still one gesture.
      const node = document.getElementById("rydin-referral-link");
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  };

  const share = async () => {
    const text = `I'm ${standing.currentPosition.toLocaleString("en-IN")} in line for Rydin — split fuel costs with verified commuters on your route. Skip ahead with my link:`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Rydin waitlist", text, url: link });
        return;
      } catch {
        /* Dismissed — fall through to copy. */
      }
    }
    void copyLink();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING_SOFT}
      className="relative w-full"
    >
      <div className="relative overflow-hidden rounded-[26px] bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl shadow-slate-200/50 dark:shadow-none ring-1 ring-white/40 dark:ring-white/10">
        {/* ---------- Upper stub: the position ---------- */}
        <div className="relative px-5 pb-6 pt-5 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 dark:bg-brand-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300 ring-1 ring-inset ring-brand-500/20 dark:ring-brand-500/30">
              <Ticket className="h-3.5 w-3.5" strokeWidth={2.2} />
              Commuter
            </span>
            <div className="text-right">
              <p className="font-mono text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Pass
              </p>
              <p className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
                {pass.passId}
              </p>
            </div>
          </div>

          {/* The number. The one place on the page type goes truly large. */}
          <div className="mt-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Your position in the queue
            </p>
            <div className="mt-1 flex items-end gap-2">
              <motion.span
                key={standing.currentPosition}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={SPRING}
                className="font-mono text-5xl font-bold leading-none tracking-tight text-slate-900 dark:text-slate-50 sm:text-6xl"
                data-numeric
              >
                #{formatCount(standing.currentPosition)}
              </motion.span>
              {standing.totalJump > 0 && (
                <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-brand-700 dark:text-brand-300 ring-1 ring-inset ring-brand-500/20 dark:ring-brand-500/30">
                  <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
                  {formatCount(standing.totalJump)}
                </span>
              )}
            </div>
          </div>

          {/* Why the number moved. Never an unexplained figure. */}
          {standing.totalJump > 0 && (
            <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400">
              Started at{" "}
              <span className="font-mono text-slate-600 dark:text-slate-300">
                #{formatCount(standing.basePosition)}
              </span>
              {standing.institutionalJump > 0 && (
                <>
                  {" · "}
                  <span className="text-brand-700 dark:text-brand-300">
                    {formatCount(standing.institutionalJump)} for a verified
                    domain
                  </span>
                </>
              )}
              {standing.referralJump > 0 && (
                <>
                  {" · "}
                  <span className="text-brand-700 dark:text-brand-300">
                    {formatCount(standing.referralJump)} from {pass.referrals}{" "}
                    invite{pass.referrals === 1 ? "" : "s"}
                  </span>
                </>
              )}
            </p>
          )}

          {/*
            The four collected answers, set like a ticket's fine print. The email
            is masked: this card is the thing people screenshot to share their
            position, and a full address does not need to travel with it.
          */}
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-900/[0.07] dark:border-slate-50/[0.07] pt-4">
            <StubField label="Username" value={pass.username || "—"} />
            <StubField label="Email" value={maskEmail(pass.email)} mono />
            <StubField label="Route" value={pass.route || "—"} />
            <StubField label="Issued" value={passIssuedOn(pass)} mono />
          </dl>

          {(pass.institutionVerified || pass.womenOnlyPreference) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {pass.institutionVerified && (
                <Badge tone="amber">Institution verified</Badge>
              )}
              {pass.womenOnlyPreference && (
                <Badge tone="emerald">Women-Only Matching Mode</Badge>
              )}
            </div>
          )}

          {/*
            The position was issued locally because the API was unreachable. Said
            out loud: a number that might be provisional should admit it rather
            than be presented as a database fact.
          */}
          {pass.origin === "local" && (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-gold-50 px-3 py-2.5 text-[11px] leading-relaxed text-gold-700 ring-1 ring-inset ring-gold-400/30">
              <WifiOff className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
              Saved on this device — we couldn&apos;t reach the queue server, so
              this position is provisional. It is confirmed the next time you
              open the page online.
            </p>
          )}
        </div>

        {/* ---------- The tear line ---------- */}
        <div className="relative h-6">
          <span className="stub-notch stub-notch-left top-1/2 -translate-y-1/2" aria-hidden="true" />
          <span className="stub-notch stub-notch-right top-1/2 -translate-y-1/2" aria-hidden="true" />
          <span
            className="absolute inset-x-5 top-1/2 h-px -translate-y-1/2 stub-perforation sm:inset-x-6"
            aria-hidden="true"
          />
        </div>

        {/* ---------- Lower stub: the referral engine ---------- */}
        <div className="px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Your referral link
          </p>

          <div className="mt-2 flex items-stretch gap-2">
            <div className="flex min-w-0 flex-1 items-center rounded-xl bg-black/5 dark:bg-white/10 px-3 ring-hairline-strong">
              <span
                id="rydin-referral-link"
                className="truncate font-mono text-xs font-medium text-brand-700 dark:text-brand-300"
              >
                {link}
              </span>
            </div>
            <Tactile
              onClick={copyLink}
              ariaLabel={copied ? "Link copied" : "Copy referral link"}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand-500/60",
                copied
                  ? "bg-brand-500 text-white shadow-brand-sm"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-card ring-hairline hover:bg-slate-50 dark:bg-slate-800/50",
              )}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" strokeWidth={2.3} />
                  Copy
                </>
              )}
            </Tactile>
            <Tactile
              onClick={share}
              ariaLabel="Share referral link"
              className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-900 px-3 py-2.5 text-slate-700 dark:text-slate-200 shadow-card ring-hairline transition-colors hover:bg-slate-50 dark:bg-slate-800/50 focus-visible:ring-2 focus-visible:ring-brand-500/60"
            >
              <Share2 className="h-3.5 w-3.5" strokeWidth={2.3} />
            </Tactile>
          </div>

          {/* Tier tracker */}
          <div className="mt-5">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {tiers.next ? (
                  <>
                    Invite {tiers.remaining} more to unlock{" "}
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {tiers.next.title}
                    </span>
                  </>
                ) : (
                  <span className="font-semibold text-brand-700 dark:text-brand-300">
                    Every reward unlocked. You&apos;re a Founding Member.
                  </span>
                )}
              </p>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {pass.referrals}/{REWARD_TIERS[REWARD_TIERS.length - 1].referrals}
              </p>
            </div>

            {/* Progress rail with a milestone node per tier. */}
            <div className="relative mt-2.5 h-1.5 rounded-full bg-slate-900/[0.08] dark:bg-slate-50/[0.08]">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                initial={false}
                animate={{ width: `${tiers.percent}%` }}
                transition={SPRING}
              />
              {REWARD_TIERS.map((tier) => {
                const at =
                  (tier.referrals /
                    REWARD_TIERS[REWARD_TIERS.length - 1].referrals) *
                  100;
                const reached = pass.referrals >= tier.referrals;
                return (
                  <span
                    key={tier.referrals}
                    title={`${tier.referrals} invites — ${tier.title}`}
                    style={{ left: `${at}%` }}
                    className={cn(
                      "absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 transition-colors",
                      reached
                        ? "bg-brand-500 ring-white"
                        : "bg-slate-300 ring-white",
                    )}
                  />
                );
              })}
            </div>

            <p className="mt-2.5 font-mono text-[11px] font-medium text-gold-600">
              +{formatCount(QUEUE.spotsPerReferral)} spots per confirmed invite
            </p>
          </div>

          {/* Demo affordance. Labelled honestly rather than dressed up as real. */}
          <div className="mt-5 flex items-center gap-2 border-t border-slate-900/[0.07] dark:border-slate-50/[0.07] pt-4">
            <Tactile
              onClick={onAddReferral}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 shadow-card ring-hairline transition-colors hover:bg-slate-50 dark:bg-slate-800/50 focus-visible:ring-2 focus-visible:ring-brand-500/60"
            >
              <UserPlus className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" strokeWidth={2.2} />
              Simulate an invite
            </Tactile>
            <button
              type="button"
              onClick={onReset}
              className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-slate-400 dark:text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-200 focus-visible:ring-2 focus-visible:ring-brand-500/60"
            >
              Leave the queue
              <ArrowUpRight className="h-3 w-3" strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StubField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 truncate text-sm text-slate-800 dark:text-slate-100",
          mono && "font-mono text-xs",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "emerald" | "amber";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
        tone === "amber"
          ? "bg-gold-50 text-gold-700 ring-gold-400/30"
          : "bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 ring-brand-500/20 dark:ring-brand-500/30",
      )}
    >
      <Check className="h-3 w-3" strokeWidth={3} />
      {children}
    </span>
  );
}
