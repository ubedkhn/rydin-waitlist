"use client";

import { BadgeCheck, Fuel, Route, Users } from "lucide-react";
import { formatCount, formatINR } from "@/lib/rydin/calc";
import { useWaitlist } from "@/components/waitlist/WaitlistProvider";
import { AnimatedNumber, Reveal } from "@/components/ui/motion";
import { PulseDot } from "@/components/ui/primitives";

/* ================================================================== *
 * Live telemetry strip.
 *
 * Every figure here comes out of one `telemetry` object on the waitlist
 * context — commuters, pooled savings and corridor count alike. Nothing
 * on this strip is a literal in this file. That matters for two
 * reasons: the numbers can never drift apart on screen (readers notice
 * when a "live" counter moves and its dependent total doesn't), and when
 * `GET /api/waitlist/stats` starts answering, the provider swaps the
 * object and this component is already correct with no edit.
 *
 * The commuter count starts at the mandated floor of 200 and only ever
 * rises — see QUEUE.baseCount and the clamp in WaitlistProvider.
 * ================================================================== */

export function TelemetryStrip() {
  const { telemetry } = useWaitlist();

  return (
    <section className="relative px-4 py-10 sm:px-6 lg:py-14">
      <Reveal className="mx-auto max-w-6xl">
        {/*
          `gap-px` over a slate ground draws the dividing hairlines between
          cells — one element, four rules, no border bookkeeping per cell.
        */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-slate-900/[0.08] shadow-card ring-hairline lg:grid-cols-4">
          <Cell
            icon={<Users className="h-4 w-4" strokeWidth={2.2} />}
            label="Commuters in queue"
            live
            value={
              <AnimatedNumber
                value={telemetry.commuters}
                format={(n) => formatCount(n)}
              />
            }
          />
          <Cell
            icon={<Fuel className="h-4 w-4" strokeWidth={2.2} />}
            label="Projected monthly fuel savings"
            tone="amber"
            value={
              <AnimatedNumber
                value={telemetry.monthlyFuelSavings}
                format={(n) => formatINR(n)}
              />
            }
          />
          <Cell
            icon={<Route className="h-4 w-4" strokeWidth={2.2} />}
            label="Active corridors"
            value={<AnimatedNumber value={telemetry.activeCorridors} />}
            footnote="Indore ⇄ Bhopal + campus micro-routes"
          />
          <Cell
            icon={<BadgeCheck className="h-4 w-4" strokeWidth={2.2} />}
            label="Government ID verified"
            value={<span className="font-mono">100%</span>}
            footnote="No exceptions, no skippable steps"
          />
        </div>
      </Reveal>
    </section>
  );
}

function Cell({
  icon,
  label,
  value,
  footnote,
  live,
  tone = "emerald",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  footnote?: string;
  live?: boolean;
  tone?: "emerald" | "amber";
}) {
  return (
    <div className="bg-paper-raise p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <span className={tone === "amber" ? "text-gold-500" : "text-brand-600"}>
          {icon}
        </span>
        {live && <PulseDot className="ml-auto" />}
      </div>
      <p
        className={`mt-3 font-mono text-2xl font-bold tracking-tight sm:text-3xl ${
          tone === "amber" ? "text-gold-600" : "text-slate-900"
        }`}
        data-numeric
      >
        {value}
      </p>
      <p className="mt-1.5 text-xs font-medium text-slate-600">{label}</p>
      {footnote && (
        <p className="mt-1 text-[11px] leading-snug text-slate-400">{footnote}</p>
      )}
    </div>
  );
}
