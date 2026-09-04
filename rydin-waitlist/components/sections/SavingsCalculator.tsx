"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bike, Car, Info, TrendingDown, Users } from "lucide-react";
import { FARE_MODEL } from "@/lib/rydin/constants";
import {
  availableSeats,
  computeSavings,
  formatINR,
  normaliseSeats,
} from "@/lib/rydin/calc";
import type { Frequency, VehicleType } from "@/lib/rydin/types";
import {
  AnimatedNumber,
  Reveal,
  SPRING,
  SPRING_TACTILE,
} from "@/components/ui/motion";
import { SectionLabel } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * Commute savings calculator.
 *
 * Two baselines, because they answer different questions. Against a commercial
 * cab the gap is enormous, but most of it is the driver's labour and the
 * platform's cut — real, yet it flatters us, so it is reported quietly.
 * Against driving the same commute solo is the honest comparison, it is the
 * only one whose ratio responds to how many seats get filled, and it is where
 * the "up to 50%" claim actually comes from. That one gets the headline.
 */
export function SavingsCalculator() {
  const [distance, setDistance] = useState<number>(FARE_MODEL.distance.default);
  const [frequency, setFrequency] = useState<Frequency>(5);
  const [vehicle, setVehicle] = useState<VehicleType>("four-wheeler");
  const [seats, setSeats] = useState<number>(FARE_MODEL.defaultSeats);

  const seatOptions = availableSeats(vehicle);
  const effectiveSeats = normaliseSeats(vehicle, seats);

  const result = useMemo(
    () => computeSavings(distance, frequency, vehicle, effectiveSeats),
    [distance, frequency, vehicle, effectiveSeats],
  );

  const pct =
    (distance - FARE_MODEL.distance.min) /
    (FARE_MODEL.distance.max - FARE_MODEL.distance.min);

  return (
    <section id="savings" className="relative px-4 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionLabel index="02" title="Run your numbers" />

        <Reveal>
          <h2 className="mt-6 max-w-2xl text-display-sm font-bold text-balance text-slate-900">
            What your commute actually costs you.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
            Move the slider to your one-way distance. Everything updates against
            two honest baselines.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          {/* ---------- Controls ---------- */}
          <Reveal className="rounded-3xl bg-paper-raise p-6 shadow-card ring-hairline sm:p-7">
            {/* Distance */}
            <div>
              <div className="flex items-baseline justify-between">
                <label
                  htmlFor="distance"
                  className="text-xs font-medium text-slate-500"
                >
                  Your one-way travel distance
                </label>
                <span
                  className="font-mono text-sm font-semibold text-brand-700"
                  data-numeric
                >
                  {distance} km
                </span>
              </div>
              <input
                id="distance"
                type="range"
                min={FARE_MODEL.distance.min}
                max={FARE_MODEL.distance.max}
                step={FARE_MODEL.distance.step}
                value={distance}
                onChange={(e) => setDistance(Number(e.target.value))}
                className="mt-3"
                aria-valuetext={`${distance} kilometres`}
                style={{
                  // Fill the track up to the thumb without a second element. The
                  // unfilled half is slate, not white — on paper the empty part
                  // of a track has to be *darker* than the surface it sits on.
                  background: `linear-gradient(to right, rgba(5,164,126,0.85) ${pct * 100}%, rgba(15,23,42,0.10) ${pct * 100}%)`,
                  borderRadius: 999,
                  height: 6,
                }}
              />
              <div className="mt-1.5 flex justify-between font-mono text-[10px] text-slate-400">
                <span>{FARE_MODEL.distance.min} km</span>
                <span>{FARE_MODEL.distance.max} km</span>
              </div>
            </div>

            {/* Frequency */}
            <div className="mt-6">
              <p className="mb-2 text-xs font-medium text-slate-500">
                Commute frequency
              </p>
              <Segmented
                options={[
                  { id: 5, label: "5 days", sub: "Weekdays" },
                  { id: 7, label: "7 days", sub: "All week" },
                ]}
                value={frequency}
                onChange={(v) => setFrequency(v as Frequency)}
                layoutId="freq-pill"
              />
            </div>

            {/* Vehicle */}
            <div className="mt-6">
              <p className="mb-2 text-xs font-medium text-slate-500">
                Vehicle type
              </p>
              <Segmented
                options={[
                  {
                    id: "two-wheeler",
                    label: "Two-wheeler",
                    sub: "Bike",
                    icon: Bike,
                  },
                  {
                    id: "four-wheeler",
                    label: "Four-wheeler",
                    sub: "Car",
                    icon: Car,
                  },
                ]}
                value={vehicle}
                onChange={(v) => {
                  const next = v as VehicleType;
                  setVehicle(next);
                  setSeats(normaliseSeats(next, seats));
                }}
                layoutId="vehicle-pill"
              />
            </div>

            {/* Seats — only meaningful for a car. A bike is always rider +
                pillion, so the control is hidden rather than shown disabled. */}
            {seatOptions.length > 1 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={SPRING}
                className="mt-6 overflow-hidden"
              >
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <Users className="h-3.5 w-3.5 text-brand-600" />
                  People sharing the fuel bill
                </p>
                <Segmented
                  options={seatOptions.map((n) => ({
                    id: n,
                    label: `${n}`,
                    sub: n === 2 ? "You + 1" : `You + ${n - 1}`,
                  }))}
                  value={effectiveSeats}
                  onChange={(v) => setSeats(Number(v))}
                  layoutId="seats-pill"
                />
              </motion.div>
            )}
          </Reveal>

          {/* ---------- Output ---------- */}
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Commercial */}
              <Reveal
                delay={0.05}
                className="relative rounded-3xl bg-paper-raise p-6 shadow-card ring-hairline"
              >
                <p className="text-xs font-medium text-slate-500">
                  Commercial cabs / taxis
                </p>
                <p
                  className="mt-3 font-mono text-3xl font-bold tracking-tight text-slate-900"
                  data-numeric
                >
                  <AnimatedNumber
                    value={result.commercialMonthly}
                    format={formatINR}
                    durationMs={520}
                  />
                </p>
                <p className="mt-1 text-[11px] text-slate-400">per month</p>
                <p className="mt-4 text-[11px] leading-snug text-slate-500">
                  {FARE_MODEL.commercial[vehicle].label} at published rates. No
                  surge multiplier applied.
                </p>
              </Reveal>

              {/* Rydin */}
              <Reveal
                delay={0.1}
                className="relative overflow-hidden rounded-3xl bg-brand-50 p-6 shadow-card ring-1 ring-inset ring-brand-500/20"
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-200/50 blur-3xl"
                />
                <p className="relative text-xs font-medium text-brand-700">
                  With Rydin cost-sharing
                </p>
                <p
                  className="relative mt-3 font-mono text-3xl font-bold tracking-tight text-brand-800"
                  data-numeric
                >
                  <AnimatedNumber
                    value={result.rydinMonthly}
                    format={formatINR}
                    durationMs={520}
                  />
                </p>
                <p className="relative mt-1 text-[11px] text-brand-600">
                  per month
                </p>
                <p className="relative mt-4 text-[11px] leading-snug text-brand-700/80">
                  Your share of fuel across {effectiveSeats} people, plus a flat
                  ₹{FARE_MODEL.vehicle[vehicle].feePerTrip}/trip fee.
                </p>
              </Reveal>
            </div>

            {/* Headline callout */}
            <Reveal
              delay={0.15}
              className="rounded-3xl bg-gradient-to-br from-brand-50 to-white p-6 shadow-card ring-1 ring-inset ring-brand-500/20 sm:p-7"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-medium text-brand-700">
                    <TrendingDown className="h-3.5 w-3.5" strokeWidth={2.4} />
                    You pocket
                  </p>
                  <p
                    className="mt-1.5 font-mono text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl"
                    data-numeric
                  >
                    <AnimatedNumber
                      value={result.savedVsCommercialYearly}
                      format={formatINR}
                      durationMs={620}
                    />
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    a year, versus cabs
                  </p>
                </div>

                {/* The honest, headline-worthy comparison. */}
                <div className="rounded-2xl bg-white px-4 py-3 shadow-card ring-hairline">
                  {result.costsMoreThanSolo ? (
                    <>
                      <p className="font-mono text-2xl font-bold text-gold-600">
                        —
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                        cheaper to just
                        <br />
                        ride this one alone
                      </p>
                    </>
                  ) : (
                    <>
                      <p
                        className="font-mono text-2xl font-bold text-brand-700"
                        data-numeric
                      >
                        <AnimatedNumber
                          value={result.savedVsSoloPercent}
                          format={(n) => `${Math.round(n)}%`}
                          durationMs={520}
                        />
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                        cheaper than driving
                        <br />
                        this commute solo
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Honest notes where pooling genuinely isn't the right call.
                  Two distinct cases: actively worse than driving yourself, and
                  merely thin. Saying so costs one sentence and buys the rest of
                  the page its credibility. */}
              {result.costsMoreThanSolo ? (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-5 flex items-start gap-2 rounded-xl bg-gold-50 px-3.5 py-3 text-[11px] leading-relaxed text-gold-700 ring-1 ring-inset ring-gold-400/30"
                >
                  <Info className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2.3} />
                  <span>
                    Below {result.soloBreakEvenKm.toFixed(1)} km on a{" "}
                    {FARE_MODEL.vehicle[vehicle].shortLabel.toLowerCase()} the flat
                    ₹{FARE_MODEL.vehicle[vehicle].feePerTrip} fee costs more than
                    the fuel it splits, so riding alone is cheaper. Still far less
                    than a {FARE_MODEL.commercial[vehicle].label.toLowerCase()} —
                    but we&apos;d rather tell you than round it up to zero.
                  </span>
                </motion.p>
              ) : (
                result.isLowValue && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-5 flex items-start gap-2 rounded-xl bg-gold-50 px-3.5 py-3 text-[11px] leading-relaxed text-gold-700 ring-1 ring-inset ring-gold-400/30"
                  >
                    <Info
                      className="mt-px h-3.5 w-3.5 shrink-0"
                      strokeWidth={2.3}
                    />
                    <span>
                      At this distance the flat per-trip fee is most of what
                      you&apos;d pay, so sharing saves little against driving
                      yourself. Worth it against a cab, not worth the coordination
                      otherwise.
                    </span>
                  </motion.p>
                )
              )}
            </Reveal>

            {/* Assumptions. Stated, not buried. */}
            <p className="px-1 text-[11px] leading-relaxed text-slate-400">
              Estimates, not quotes. Assumes ₹{FARE_MODEL.petrolPerLitre}/L
              petrol, {FARE_MODEL.vehicle[vehicle].mileage} km/L for a{" "}
              {FARE_MODEL.vehicle[vehicle].shortLabel.toLowerCase()},{" "}
              {result.tripsPerDay} trips a day and {result.daysPerMonth} commute
              days a month. Your share works out to about ₹
              {result.rydinPerKm.toFixed(2)}/km. Driving solo the same distance
              would cost {formatINR(result.soloMonthly)}/month in fuel alone.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Segmented — the Apple-style pill toggle, with a highlight that
 * travels between options via layoutId.
 *
 * The trough is `paper-sunken` with a stronger hairline: a control that
 * accepts input should read as pressed *into* the card, which is the only
 * honest way to signal interactivity when everything else is already white.
 * ------------------------------------------------------------------ */
function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  layoutId,
}: {
  options: { id: T; label: string; sub?: string; icon?: typeof Car }[];
  value: T;
  onChange: (v: T) => void;
  layoutId: string;
}) {
  return (
    <div
      className="grid gap-1.5 rounded-2xl bg-paper-sunken p-1.5 ring-hairline-strong"
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
      role="group"
    >
      {options.map((opt) => {
        const active = opt.id === value;
        const Icon = opt.icon;
        return (
          <motion.button
            key={String(opt.id)}
            type="button"
            onClick={() => onChange(opt.id)}
            whileTap={{ scale: 0.97 }}
            transition={SPRING_TACTILE}
            aria-pressed={active}
            className="relative flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 focus-visible:ring-2 focus-visible:ring-brand-500/60"
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={SPRING}
                className="absolute inset-0 rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 shadow-brand-sm"
              />
            )}
            {Icon && (
              <Icon
                className={cn(
                  "relative h-4 w-4 shrink-0",
                  active ? "text-white" : "text-slate-400",
                )}
                strokeWidth={2.2}
              />
            )}
            <span className="relative text-center leading-tight">
              <span
                className={cn(
                  "block text-xs font-semibold",
                  active ? "text-white" : "text-slate-700",
                )}
              >
                {opt.label}
              </span>
              {opt.sub && (
                <span
                  className={cn(
                    "block text-[10px]",
                    active ? "text-brand-50/90" : "text-slate-400",
                  )}
                >
                  {opt.sub}
                </span>
              )}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
