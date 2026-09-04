import { BadgeCheck, Fuel, Zap } from "lucide-react";
import { Dot, Eyebrow, GlowOrb } from "@/components/ui/primitives";
import { WaitlistCard } from "@/components/waitlist/WaitlistCard";

/**
 * Hero.
 *
 * Two-column above the lg breakpoint: the thesis on the left, the interactive
 * waitlist widget on the right. Stacks on mobile with the card first-in-reach.
 * The headline is the page's opening argument, set in the display ramp with the
 * brand accent carried by the single phrase that names the promise.
 *
 * This section stays a server component — only the card below it is a client
 * island, so the headline and copy ship as static HTML.
 */
export function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pt-32 lg:pb-24 lg:pt-40"
    >
      {/* Ambient blooms */}
      <GlowOrb className="left-[-10%] top-[-6%] h-[38rem] w-[38rem]" />
      <GlowOrb
        className="right-[-12%] top-[18%] h-[30rem] w-[30rem] [animation-delay:-6s]"
        tone="amber"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        {/* Left — thesis */}
        <div className="max-w-xl">
          <Eyebrow>
            <Zap
              className="h-3.5 w-3.5 text-brand-500"
              fill="currentColor"
              strokeWidth={0}
            />
            Zero surge
            <Dot />
            100% verified peers
            <Dot />
            Save up to 50%
          </Eyebrow>

          <h1 className="mt-5 text-display-lg font-bold text-balance text-slate-900">
            Daily commuting is broken.{" "}
            <span className="bg-gradient-to-br from-brand-500 to-brand-700 bg-clip-text text-transparent">
              We built the cure.
            </span>
          </h1>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600 text-pretty sm:text-lg">
            Stop paying surge fares to commercial cabs. Connect with verified
            students and professionals travelling your exact route — split the
            fuel, share the seats, travel safely.
          </p>

          {/* Trust strip */}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <TrustPoint icon={Fuel} label="Fuel cost split, not fares" />
            <TrustPoint icon={BadgeCheck} label="Aadhaar + selfie verified" />
            <TrustPoint icon={Zap} label="No surge, ever" />
          </div>
        </div>

        {/* Right — the interactive widget */}
        <div className="relative">
          {/*
            Soft riser behind the card. On paper this is a tint, not a light
            source — it warms the ground the card sits on so the card's own
            shadow has something to fall against.
          */}
          <div
            aria-hidden="true"
            className="absolute -inset-4 -z-10 rounded-[32px] bg-gradient-to-b from-brand-200/40 to-transparent blur-2xl"
          />
          <WaitlistCard />
        </div>
      </div>
    </section>
  );
}

function TrustPoint({
  icon: Icon,
  label,
}: {
  icon: typeof Fuel;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-600">
      <Icon className="h-4 w-4 text-brand-600" strokeWidth={2.1} />
      {label}
    </span>
  );
}
