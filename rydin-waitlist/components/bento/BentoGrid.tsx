import {
  Fuel,
  Fingerprint,
  MapPin,
  Radar,
  Camera,
  ShieldCheck,
  Shield,
  Car,
  Check,
} from "lucide-react";
import { GlassPanel, SectionLabel } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * "Why Rydin" Bento — Module 1 (static).
 *
 * Asymmetric CSS grid. On lg it is a 3-column, 3-row bento:
 *   row 1–2, col 1–2  →  Save up to 50%   (the large thesis block)
 *   row 1,   col 3    →  100% Verified
 *   row 2,   col 3    →  Women-Only Matching
 *   row 3,   col 1–3  →  Smart Hyper-Local Radars (full width)
 * Everything collapses to a single column on mobile in reading order.
 *
 * Each block carries a real micro-visual built from SVG + the mono numeral
 * face, not a decorative icon — the comparison, the checklist, the radar
 * rings each say something true about the mechanic they describe.
 */

function BentoCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <GlassPanel
      as="article"
      className={cn(
        // On paper the card is already the whitest surface, so hover cannot
        // brighten it — it lifts instead, via the next rung of the shadow ladder.
        "group relative overflow-hidden p-6 transition-shadow hover:shadow-lift sm:p-7",
        className,
      )}
    >
      {children}
    </GlassPanel>
  );
}

/** The recessed square that every bento glyph sits in. */
const GLYPH_TILE =
  "grid place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-500/15";

/* ---- Large block visual: flat micro-fee vs aggregator commission ---- */
function FeeComparison() {
  return (
    <div className="mt-6 space-y-3">
      {/* Aggregator */}
      <div>
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="text-slate-500">
            Aggregators take a cut of every fare
          </span>
          <span className="font-mono font-semibold text-slate-600">~25%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-paper-sunken ring-hairline">
          <div className="h-full w-1/4 rounded-full bg-gradient-to-r from-slate-400 to-slate-500" />
        </div>
      </div>
      {/* Rydin */}
      <div>
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="text-brand-700">Rydin charges a flat micro-fee</span>
          <span className="font-mono font-semibold text-brand-700">
            ₹4–₹8/trip
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-paper-sunken ring-hairline">
          {/* Deliberately a sliver — the point is how little it is. */}
          <div className="h-full w-[6%] min-w-[10px] rounded-full bg-gradient-to-r from-brand-400 to-brand-600 shadow-brand-sm" />
        </div>
      </div>
    </div>
  );
}

/* ---- KYC checklist ---- */
function KycChecklist() {
  const checks = [
    { icon: Fingerprint, label: "Aadhaar" },
    { icon: Car, label: "Driving Licence + RC" },
    { icon: Camera, label: "Live selfie" },
  ];
  return (
    <ul className="mt-5 space-y-2.5">
      {checks.map(({ icon: Icon, label }) => (
        <li
          key={label}
          className="flex items-center gap-2.5 text-sm text-slate-700"
        >
          <span className={cn(GLYPH_TILE, "h-7 w-7")}>
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
          <span className="flex-1">{label}</span>
          <span className="grid h-4 w-4 place-items-center rounded-full bg-brand-500">
            <Check className="h-3 w-3 text-white" strokeWidth={3} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ---- Radar rings ---- */
function RadarRings() {
  return (
    <div className="relative mt-2 h-full min-h-[9rem] w-full">
      <svg
        viewBox="0 0 320 150"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid meet"
      >
        {/*
          Stroke opacities climb inward. On white the ring set has to stay
          above ~0.25 or the outer ellipse disappears entirely — the values
          that read correctly on midnight are invisible here.
        */}
        {[130, 92, 54].map((r, i) => (
          <ellipse
            key={r}
            cx="160"
            cy="120"
            rx={r}
            ry={r * 0.42}
            fill="none"
            stroke="#05A47E"
            strokeOpacity={0.26 + i * 0.14}
            strokeWidth="1"
          />
        ))}
        {/* Match pins along a walkable band */}
        <g>
          <circle cx="118" cy="96" r="3.5" fill="#048A6A" />
          <circle cx="205" cy="104" r="3.5" fill="#048A6A" />
          <circle cx="176" cy="80" r="3" fill="#2ECC9E" />
        </g>
        {/* You */}
        <circle cx="160" cy="120" r="5.5" fill="#05A47E" />
        <circle cx="160" cy="120" r="9" fill="#05A47E" opacity="0.18" />
      </svg>
      <div className="absolute bottom-0 left-0 flex gap-4">
        <span className="font-mono text-xs text-brand-700">800 m</span>
        <span className="font-mono text-xs text-slate-400">–</span>
        <span className="font-mono text-xs text-brand-700">1.5 km</span>
      </div>
    </div>
  );
}

export function BentoGrid() {
  return (
    <section id="why" className="relative px-4 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionLabel index="01" title="Why Rydin" />

        <h2 className="mt-6 max-w-2xl text-display-sm font-bold text-balance text-slate-900">
          Everything a taxi app isn&apos;t built to give you.
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          {/* Block 1 — Large */}
          <BentoCard className="flex flex-col sm:col-span-2 lg:col-span-2 lg:row-span-2">
            <div className="flex items-center gap-2.5">
              <span className={cn(GLYPH_TILE, "h-10 w-10")}>
                <Fuel className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="rounded-full bg-brand-50 px-2.5 py-1 font-mono text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-500/20">
                Save up to 50%
              </span>
            </div>
            <h3 className="mt-5 text-2xl font-semibold text-slate-900">
              Direct fuel cost sharing. Zero middleman commissions.
            </h3>
            <p className="mt-2.5 max-w-md text-sm leading-relaxed text-slate-600">
              You split the actual fuel cost for the distance you travel together
              — nothing more. No fare meter, no surge, no 25% platform cut skimmed
              off the top of every ride.
            </p>
            <FeeComparison />
            <p className="mt-auto pt-6 text-xs text-slate-400">
              Compared with driving the same commute solo, at full occupancy.
            </p>
          </BentoCard>

          {/* Block 2 — Square */}
          <BentoCard className="flex flex-col">
            <div className="flex items-center justify-between">
              <span className={cn(GLYPH_TILE, "h-10 w-10")}>
                <ShieldCheck className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="font-mono text-xs font-semibold text-brand-700">
                100%
              </span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              Verified, not anonymous
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Mandatory KYC for everyone. No skippable steps.
            </p>
            <KycChecklist />
          </BentoCard>

          {/* Block 3 — Square */}
          <BentoCard className="flex flex-col">
            <div className="flex items-center justify-between">
              <span className={cn(GLYPH_TILE, "h-10 w-10")}>
                <Shield className="h-5 w-5" strokeWidth={2} />
              </span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              Women-only matching
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Enforced in the matching layer, not left to preference. Verified
              women match only with verified women — both directions.
            </p>
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs text-slate-700 shadow-card ring-hairline">
                <Camera className="h-3.5 w-3.5 text-brand-600" />
                ID-confirmed
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs text-slate-700 shadow-card ring-hairline">
                Algorithm-enforced
              </span>
            </div>
          </BentoCard>

          {/* Block 4 — Full width */}
          <BentoCard className="sm:col-span-2 lg:col-span-3">
            <div className="grid items-center gap-6 lg:grid-cols-2">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className={cn(GLYPH_TILE, "h-10 w-10")}>
                    <Radar className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5 text-brand-600" />
                    Hyper-local
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-semibold text-slate-900">
                  Smart hyper-local radars
                </h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                  Matches surface within an 800 m–1.5 km walking radius, so
                  pickups sit on the route your driver is already taking. No
                  detours, no 15-minute crawl to reach you.
                </p>
              </div>
              <RadarRings />
            </div>
          </BentoCard>
        </div>
      </div>
    </section>
  );
}
