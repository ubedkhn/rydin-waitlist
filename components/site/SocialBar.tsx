"use client";

import { Instagram, Linkedin, Mail } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SOCIAL } from "@/lib/rydin/constants";
import type { SocialLink } from "@/lib/rydin/types";

/* ================================================================== *
 * SocialBar — the floating reach-us rail.
 *
 * A vertical pill pinned to the left gutter, from the same `SOCIAL`
 * array the footer renders, so a URL only ever has to change in one
 * place: Instagram (@rydinapp), LinkedIn, and a live `mailto:` to the
 * helpdesk.
 *
 * Hidden below `xl`. Two reasons, both practical rather than aesthetic:
 * the page's content column is `max-w-6xl`, so a gutter rail only has
 * room to float once the viewport is wider than that; and on a phone the
 * bottom of the screen already belongs to StickyCta, so a second
 * floating element there would be two overlays fighting for the same
 * thumb. Small screens get the footer's labelled list instead, which is
 * the better control on touch anyway.
 * ================================================================== */

const ICON: Record<SocialLink["id"], LucideIcon> = {
  instagram: Instagram,
  linkedin: Linkedin,
  email: Mail,
};

export function SocialBar() {
  return (
    <div className="pointer-events-none fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 xl:block">
      <nav
        aria-label="Rydin on social and support"
        className="pointer-events-auto flex flex-col items-center gap-1 rounded-2xl bg-white/90 dark:bg-slate-900/90 p-1.5 shadow-lift ring-hairline backdrop-blur-xl"
      >
        {SOCIAL.map((item) => {
          const Icon = ICON[item.id];
          const external = item.href.startsWith("http");
          return (
            <a
              key={item.id}
              href={item.href}
              // `mailto:` must open in the same context or the mail client
              // never launches from a blocked popup.
              {...(external
                ? { target: "_blank", rel: "noreferrer noopener" }
                : {})}
              aria-label={`${item.label} — ${item.handle}`}
              className="group relative grid h-10 w-10 place-items-center rounded-xl text-slate-500 dark:text-slate-400 transition-colors hover:bg-brand-50 dark:bg-brand-500/10 hover:text-brand-700 dark:text-brand-300 focus-visible:ring-2 focus-visible:ring-brand-500/60"
            >
              <Icon className="h-4 w-4" strokeWidth={2.1} />

              {/*
                The handle, revealed on hover/focus. `aria-hidden` because the
                anchor's own aria-label already carries it — a screen reader
                should not hear the account name twice.
              */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lift group-hover:block group-focus-visible:block"
              >
                {item.handle}
              </span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
