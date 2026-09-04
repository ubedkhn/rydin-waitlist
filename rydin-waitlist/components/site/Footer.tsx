"use client";

import { ArrowRight, Instagram, Linkedin, Mail, Ticket } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BRAND, SOCIAL } from "@/lib/rydin/constants";
import { formatCount } from "@/lib/rydin/calc";
import { useWaitlist } from "@/components/waitlist/WaitlistProvider";
import { Reveal, Tactile } from "@/components/ui/motion";
import { GlowOrb, PulseDot, Wordmark } from "@/components/ui/primitives";

const NAV = [
  { label: "How it works", href: "#why" },
  { label: "Savings", href: "#savings" },
  { label: "Rewards", href: "#rewards" },
  { label: "FAQ", href: "#faq" },
];

const LEGAL = [
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
  { label: "Safety", href: "#" },
];

/** One icon per SOCIAL id, so the data stays in constants and only the glyph lives here. */
const SOCIAL_ICON: Record<(typeof SOCIAL)[number]["id"], LucideIcon> = {
  instagram: Instagram,
  linkedin: Linkedin,
  email: Mail,
};

/**
 * Closing CTA + footer.
 *
 * The band above the footer is the page's last chance to convert someone who
 * read everything, so it mirrors the hero's promise in one line and reuses the
 * same shared state — a reader who already holds a pass is shown their position
 * rather than being asked again.
 *
 * The reach-us column renders `SOCIAL` from constants: real Instagram and
 * LinkedIn destinations plus a live `mailto:` for the helpdesk. Handles are
 * printed next to the glyphs, because an unlabelled icon row asks the reader to
 * guess which account they are about to open.
 */
export function Footer() {
  const { pass, standing, telemetry, focusForm } = useWaitlist();

  return (
    <footer className="relative overflow-hidden">
      <GlowOrb className="-bottom-40 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2" />

      {/* ---------- Closing CTA ---------- */}
      <div className="relative px-4 pb-16 sm:px-6 lg:pb-24">
        <Reveal className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] bg-paper-raise p-8 text-center shadow-lift ring-hairline sm:p-12">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-brand-50 px-3.5 py-1.5 ring-1 ring-inset ring-brand-500/20">
            <PulseDot />
            <span className="text-xs font-medium text-brand-700">
              Batch 1 · MP Corridor
            </span>
          </div>

          <h2 className="mx-auto mt-6 max-w-2xl text-display-sm font-bold text-balance text-slate-900">
            Your commute is already happening.
            <br />
            <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
              Stop paying full price for it.
            </span>
          </h2>

          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-slate-600">
            {pass && standing ? (
              <>
                You&apos;re holding pass{" "}
                <span className="font-mono text-slate-800">{pass.passId}</span> at
                position{" "}
                <span className="font-mono text-brand-700" data-numeric>
                  #{formatCount(standing.currentPosition)}
                </span>
                . Invite someone on your route to move up.
              </>
            ) : (
              <>
                Join{" "}
                <span className="font-mono text-slate-800" data-numeric>
                  {formatCount(telemetry.commuters)}
                </span>{" "}
                verified commuters across {telemetry.activeCorridors} corridors.
                No card, no spam — just your spot in line.
              </>
            )}
          </p>

          <Tactile
            onClick={focusForm}
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-b from-brand-400 to-brand-600 px-7 py-4 text-base font-semibold text-white shadow-brand focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            {pass ? (
              <>
                <Ticket className="h-5 w-5" strokeWidth={2.3} />
                View my Queue Pass
              </>
            ) : (
              <>
                Claim my Queue Pass
                <ArrowRight className="h-5 w-5" strokeWidth={2.4} />
              </>
            )}
          </Tactile>
        </Reveal>
      </div>

      {/* ---------- Footer proper ---------- */}
      <div className="relative border-t border-slate-900/[0.07] bg-white px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
            <div className="max-w-sm">
              <Wordmark />
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                {BRAND.positioning}.
              </p>
              <p className="mt-2 font-mono text-xs text-brand-600">
                {BRAND.tagline}
              </p>
            </div>

            <div className="flex flex-wrap gap-x-16 gap-y-8">
              <FooterColumn title="Explore" links={NAV} />
              <FooterColumn title="Legal" links={LEGAL} />

              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                  Reach us
                </p>
                <ul className="mt-4 space-y-2">
                  {SOCIAL.map((item) => {
                    const Icon = SOCIAL_ICON[item.id];
                    const external = item.href.startsWith("http");
                    return (
                      <li key={item.id}>
                        <a
                          href={item.href}
                          aria-label={`${item.label} — ${item.handle}`}
                          {...(external
                            ? { target: "_blank", rel: "noreferrer noopener" }
                            : {})}
                          className="group inline-flex items-center gap-2.5 rounded-lg text-sm text-slate-600 transition-colors hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500/60"
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-slate-500 shadow-card ring-hairline transition-colors group-hover:text-brand-600">
                            <Icon className="h-4 w-4" strokeWidth={2.1} />
                          </span>
                          <span className="truncate">{item.handle}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-4 text-xs text-slate-400">
                  Indore · Madhya Pradesh
                </p>
              </div>
            </div>
          </div>

          {/* Honest small print. A cost-sharing product lives or dies on
              being clear about what it is not. */}
          <div className="mt-12 border-t border-slate-900/[0.07] pt-6">
            <p className="max-w-3xl text-[11px] leading-relaxed text-slate-400">
              Rydin is a peer-to-peer cost-sharing network, not a taxi or
              transport service. Drivers are private individuals sharing empty
              seats on trips they are already making, and contributions are
              capped at documented fuel cost for the shared distance. Savings
              figures on this page are estimates based on the stated assumptions,
              not quotes. Queue positions are issued by the waitlist service; if
              it cannot be reached, a provisional position is held in your browser
              and confirmed on your next visit.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-slate-400">
                © {new Date().getFullYear()} {BRAND.name}. Built in Madhya
                Pradesh.
              </p>
              <p className="font-mono text-[11px] text-slate-300">
                v1.0 · waitlist
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
        {title}
      </p>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              className="rounded text-sm text-slate-600 transition-colors hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500/60"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
