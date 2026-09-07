"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  AtSign,
  ChevronDown,
  Loader,
  MapPin,
  ShieldCheck,
  UserRound,
  Users,
  Car,
  Check,
  ArrowLeft
} from "lucide-react";
import { HUBS, QUEUE, findRouteMatch } from "@/lib/rydin/constants";
import { formatCount } from "@/lib/rydin/calc";
import {
  hasErrors,
  isInstitutionalEmail,
  validateAll,
  validateField,
  type FieldErrors,
  type FieldName,
} from "@/lib/rydin/validate";
import type { Gender, WaitlistDraft } from "@/lib/rydin/types";
import { EMPTY_DRAFT, useWaitlist } from "@/components/waitlist/WaitlistProvider";
import { QueuePass } from "@/components/waitlist/QueuePass";
import { SPRING_SOFT, SPRING_TACTILE, Tactile } from "@/components/ui/motion";
import { cn } from "@/lib/utils";

/* ================================================================== *
 * WaitlistCard — the hero widget.
 *
 * Four questions, one screen, then a morph into the Queue Pass.
 *
 * This replaced a three-step wizard. Four fields do not need a wizard:
 * paging them hid how short the form was, and the progress rail spent
 * more pixels than the inputs it was pacing. Everything is visible at
 * once, so the reader can see the whole cost of joining before they
 * start typing.
 *
 * Validation runs on blur per field and again in full on submit, so
 * nobody is shown an error for a field they have not filled in yet.
 * ================================================================== */

const GENDERS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

interface WaitlistCardProps {
  onSuccess?: () => void;
}

export function WaitlistCard({ onSuccess }: WaitlistCardProps = {}) {
  const { pass, standing, hydrated, submitting, join, addReferral, reset } =
    useWaitlist();

  const [draft, setDraft] = useState<WaitlistDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<FieldErrors>({});
  /** Server-side refusal — a rate limit or a validation error we didn't catch. */
  const [formError, setFormError] = useState<string | null>(null);

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [mode, setMode] = useState<"rider" | "driver">("rider");

  const set = <K extends keyof WaitlistDraft>(key: K, value: WaitlistDraft[K]) => {
    setDraft((d) => {
      const next = { ...d, [key]: value };
      /*
       * Women-Only Matching Mode belongs to female commuters. Moving the select
       * away from Female clears it rather than leaving a hidden true behind —
       * otherwise someone could tick the toggle, change their answer, and submit
       * a preference the form is no longer showing them.
       */
      if (key === "gender" && value !== "female") next.womenOnlyPreference = false;
      return next;
    });
    setFormError(null);
    // Clear a field's error as soon as it's touched; re-check on blur.
    setErrors((e) => {
      if (!(key in e)) return e;
      const next = { ...e };
      delete next[key as keyof FieldErrors];
      return next;
    });
  };

  const checkOnBlur = (field: FieldName) => {
    const message = validateField(field, draft);
    setErrors((e) => {
      const next = { ...e };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  };

  const submit = async () => {
    const allErrors = validateAll(draft);
    if (hasErrors(allErrors)) {
      setErrors(allErrors);
      const first = (["username", "email", "route", "gender"] as const).find(
        (f) => allErrors[f],
      );
      document.getElementById(`rydin-${first}`)?.focus();
      return;
    }
    setErrors({});
    setFormError(null);

    const result = await join(draft);
    if (!result.ok) {
      setFormError(result.message);
    } else {
      onSuccess?.();
    }
  };

  const handleNext1 = () => {
    const errUsername = validateField("username", draft);
    const errEmail = validateField("email", draft);
    if (errUsername || errEmail) {
      setErrors((e) => ({ ...e, username: errUsername, email: errEmail }));
      return;
    }
    setDirection(1);
    setStep(2);
  };

  const handleNext2 = () => {
    const errRoute = validateField("route", draft);
    if (errRoute) {
      setErrors((e) => ({ ...e, route: errRoute }));
      return;
    }
    setDirection(1);
    setStep(3);
  };

  const handleBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(1, s - 1));
  };

  /** The single email field earns the institutional jump — no second question. */
  const vipUnlocked = useMemo(
    () => isInstitutionalEmail(draft.email),
    [draft.email],
  );

  /** A recognised corridor prints its own context line under the route field. */
  const matchedRoute = useMemo(() => findRouteMatch(draft.route), [draft.route]);

  // Before hydration settles we cannot know whether a pass exists, so the
  // widget holds its height rather than flashing the form then swapping.
  if (!hydrated) {
    return <CardSkeleton />;
  }

  return (
    <div id="waitlist" className="relative w-full scroll-mt-28">
      <AnimatePresence mode="popLayout" initial={false}>
        {pass && standing ? (
          <motion.div
            key="pass"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={SPRING_SOFT}
          >
            <QueuePass
              pass={pass}
              standing={standing}
              onAddReferral={addReferral}
              onReset={() => {
                reset();
                setDraft(EMPTY_DRAFT);
                setErrors({});
                setFormError(null);
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={SPRING_SOFT}
            className="relative overflow-hidden rounded-[26px] bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-xl shadow-slate-200/50 dark:shadow-none ring-1 ring-white/40 dark:ring-white/10 sm:p-6"
          >
            {/* 1. Top Segmented Mode Switcher */}
            <div className="mb-6 flex w-full items-center justify-between gap-1.5 rounded-2xl bg-black/5 dark:bg-white/5 p-1.5 ring-hairline">
              <button
                type="button"
                onClick={() => setMode("rider")}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-2.5 rounded-2xl py-2.5 transition-colors",
                  mode === "rider" ? "text-emerald-950" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200"
                )}
              >
                {mode === "rider" && (
                  <motion.div
                    layoutId="active-mode-pill"
                    className="absolute inset-0 rounded-2xl bg-emerald-500 shadow-sm"
                    transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  />
                )}
                <UserRound className="relative h-4 w-4 shrink-0" strokeWidth={2.2} />
                <span className="relative flex flex-col items-start text-left">
                  <span className="text-[13px] font-semibold leading-tight">I need a ride</span>
                  <span className="text-[10px] font-medium leading-none opacity-70">Daily commuter</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMode("driver")}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-2.5 rounded-2xl py-2.5 transition-colors",
                  mode === "driver" ? "text-emerald-950" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200"
                )}
              >
                {mode === "driver" && (
                  <motion.div
                    layoutId="active-mode-pill"
                    className="absolute inset-0 rounded-2xl bg-emerald-500 shadow-sm"
                    transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  />
                )}
                <Car className="relative h-4 w-4 shrink-0" strokeWidth={2.2} />
                <span className="relative flex flex-col items-start text-left">
                  <span className="text-[13px] font-semibold leading-tight">I have empty seats</span>
                  <span className="text-[10px] font-medium leading-none opacity-70">Vehicle owner</span>
                </span>
              </button>
            </div>

            {/* 2. Dynamic Step Breadcrumb */}
            <div className="mb-6 flex items-center justify-between gap-3 text-[11px] font-semibold tracking-wide">
              <div className={cn("flex items-center gap-2 transition-colors", step >= 1 ? "text-emerald-600" : "text-slate-400 dark:text-slate-500")}>
                <span className={cn("flex h-4 w-4 items-center justify-center rounded-full text-[9px]", step > 1 ? "bg-emerald-500 text-white" : step === 1 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400")}>
                  {step > 1 ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : "1"}
                </span>
                You
              </div>
              <div className={cn("flex-1 border-t-2", step >= 2 ? "border-solid border-emerald-500" : "border-dashed border-slate-200 dark:border-slate-800")} />
              <div className={cn("flex items-center gap-2 transition-colors", step >= 2 ? "text-emerald-600" : "text-slate-400 dark:text-slate-500")}>
                <span className={cn("flex h-4 w-4 items-center justify-center rounded-full text-[9px]", step > 2 ? "bg-emerald-500 text-white" : step === 2 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400")}>
                  {step > 2 ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : "2"}
                </span>
                Route
              </div>
              <div className={cn("flex-1 border-t-2", step >= 3 ? "border-solid border-emerald-500" : "border-dashed border-slate-200 dark:border-slate-800")} />
              <div className={cn("flex items-center gap-2 transition-colors", step >= 3 ? "text-emerald-600" : "text-slate-400 dark:text-slate-500")}>
                <span className={cn("flex h-4 w-4 items-center justify-center rounded-full text-[9px]", step === 3 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400")}>
                  3
                </span>
                Priority
              </div>
            </div>

            <div className="relative overflow-hidden">
              <AnimatePresence mode="wait" custom={direction} initial={false}>
                {step === 1 && (
                  <motion.div
                    key="step1"
                    custom={direction}
                    initial={{ opacity: 0, x: direction > 0 ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction > 0 ? -20 : 20 }}
                    transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  >
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">Reserve your spot</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pick a username and email to lock your queue position.</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-emerald-50 dark:bg-emerald-500/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/20 dark:ring-emerald-500/30">
                        BATCH 1
                      </span>
                    </div>

                    <div className="space-y-4">
                      {/* 1 — Username */}
                      <Field label="Username" htmlFor="rydin-username" error={errors.username}>
                        <div className={fieldShell(!!errors.username)}>
                          <UserRound className="ml-4 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" strokeWidth={2.1} />
                          <input
                            id="rydin-username"
                            type="text"
                            value={draft.username}
                            onChange={(e) => set("username", e.target.value)}
                            onBlur={() => checkOnBlur("username")}
                            placeholder="What co-riders will see"
                            autoComplete="nickname"
                            maxLength={24}
                            className={inputClass}
                          />
                        </div>
                      </Field>

                      {/* 2 — Email */}
                      <Field label="Email ID" htmlFor="rydin-email" error={errors.email}>
                        <div className={fieldShell(!!errors.email)}>
                          <AtSign className="ml-4 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" strokeWidth={2.1} />
                          <input
                            id="rydin-email"
                            type="email"
                            value={draft.email}
                            onChange={(e) => set("email", e.target.value)}
                            onBlur={() => checkOnBlur("email")}
                            placeholder="you@college.edu or you@gmail.com"
                            autoComplete="email"
                            inputMode="email"
                            className={inputClass}
                          />
                        </div>
                      </Field>
                    </div>

                    <Tactile
                      onClick={handleNext1}
                      className="group mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3.5 text-sm font-semibold text-white shadow-brand transition-all hover:bg-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      Continue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.4} />
                    </Tactile>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    custom={direction}
                    initial={{ opacity: 0, x: direction > 0 ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction > 0 ? -20 : 20 }}
                    transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  >
                    <div className="mb-5">
                      <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">Where do you commute?</h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Select your primary route or campus corridor.</p>
                    </div>

                    <div className="space-y-4">
                      {/* Grid of Route Chips */}
                      <div className="grid grid-cols-2 gap-2">
                        {HUBS.map((hub) => (
                          <button
                            key={hub.id}
                            type="button"
                            onClick={() => {
                              set("route", hub.label);
                              checkOnBlur("route");
                            }}
                            className={cn(
                              "flex flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition-colors",
                              draft.route === hub.label
                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20"
                                : "border-slate-200 dark:border-slate-800 bg-black/5 dark:bg-white/5 hover:border-emerald-200 hover:bg-black/5 dark:hover:bg-white/10"
                            )}
                          >
                            <span className={cn("font-mono text-[10px] font-bold tracking-wide", draft.route === hub.label ? "text-emerald-700 dark:text-emerald-400" : "text-emerald-600 dark:text-emerald-500")}>
                              {hub.code}
                            </span>
                            <span className={cn("text-[13px] font-semibold", draft.route === hub.label ? "text-emerald-950 dark:text-emerald-50" : "text-slate-700 dark:text-slate-200")}>
                              {hub.label}
                            </span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            set("route", "");
                            document.getElementById("rydin-route")?.focus();
                          }}
                          className={cn(
                            "flex flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition-colors",
                            (!HUBS.some((h) => h.label === draft.route) && draft.route !== undefined)
                              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20"
                              : "border-slate-200 dark:border-slate-800 bg-black/5 dark:bg-white/5 hover:border-emerald-200 hover:bg-black/5 dark:hover:bg-white/10"
                          )}
                        >
                          <span className={cn("font-mono text-[10px] font-bold tracking-wide", (!HUBS.some((h) => h.label === draft.route) && draft.route !== undefined) ? "text-emerald-700 dark:text-emerald-400" : "text-emerald-600 dark:text-emerald-500")}>
                            CSTM
                          </span>
                          <span className={cn("text-[13px] font-semibold", (!HUBS.some((h) => h.label === draft.route) && draft.route !== undefined) ? "text-emerald-950 dark:text-emerald-50" : "text-slate-700 dark:text-slate-200")}>
                            Custom Route
                          </span>
                        </button>
                      </div>

                      {/* 3 — Route Custom Field */}
                      <AnimatePresence mode="wait">
                        {(!HUBS.some((h) => h.label === draft.route) && draft.route !== undefined) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden pt-2"
                          >
                            <Field label="Custom Route" htmlFor="rydin-route" error={errors.route}>
                              <div className={fieldShell(!!errors.route)}>
                                <MapPin className="ml-4 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" strokeWidth={2.1} />
                                <input
                                  id="rydin-route"
                                  type="text"
                                  value={draft.route}
                                  onChange={(e) => set("route", e.target.value)}
                                  onBlur={() => checkOnBlur("route")}
                                  placeholder="Vijay Nagar → Rau"
                                  maxLength={80}
                                  className={inputClass}
                                />
                              </div>
                            </Field>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="mt-6 flex items-center gap-3">
                      <Tactile
                        onClick={handleBack}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800 px-4 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-200 dark:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-400"
                      >
                        <ArrowLeft className="h-4 w-4" strokeWidth={2.4} /> Back
                      </Tactile>
                      <Tactile
                        onClick={handleNext2}
                        className="group flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3.5 text-sm font-semibold text-white shadow-brand transition-all hover:bg-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        Continue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.4} />
                      </Tactile>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    custom={direction}
                    initial={{ opacity: 0, x: direction > 0 ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction > 0 ? -20 : 20 }}
                    transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  >
                    <div className="mb-5">
                      <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">Preferences & Verification</h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Help us route you with verified peers.</p>
                    </div>

                    <div className="space-y-4">
                      {/* 4 — Gender */}
                      <Field label="Gender" htmlFor="rydin-gender" error={errors.gender}>
                        <div className={fieldShell(!!errors.gender)}>
                          <Users className="ml-4 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" strokeWidth={2.1} />
                          <select
                            id="rydin-gender"
                            value={draft.gender}
                            onChange={(e) => set("gender", e.target.value as Gender | "")}
                            onBlur={() => checkOnBlur("gender")}
                            className={cn(
                              inputClass,
                              "cursor-pointer pr-10 appearance-none border-none outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0",
                              draft.gender === "" && "text-slate-400 dark:text-slate-500"
                            )}
                          >
                            <option value="" disabled className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50">Select</option>
                            {GENDERS.map((g) => (
                              <option key={g.value} value={g.value} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50">
                                {g.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-4 h-4 w-4 text-slate-400 transition-transform duration-200 group-focus-within:rotate-180 group-focus-within:text-emerald-500 dark:text-slate-500 dark:group-focus-within:text-brand-400" strokeWidth={2.2} />
                        </div>
                      </Field>

                      <AnimatePresence initial={false}>
                        {draft.gender === "female" && (
                          <motion.div
                            key="women-only"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={SPRING_SOFT}
                            className="overflow-hidden"
                          >
                            <button
                              type="button"
                              role="switch"
                              aria-checked={draft.womenOnlyPreference}
                              onClick={() => set("womenOnlyPreference", !draft.womenOnlyPreference)}
                              className={cn(
                                "flex w-full items-start justify-between gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors",
                                draft.womenOnlyPreference
                                  ? "bg-emerald-50 dark:bg-emerald-500/20 ring-1 ring-inset ring-emerald-500/25"
                                  : "bg-black/5 dark:bg-white/5 ring-hairline hover:bg-slate-100 dark:bg-slate-800"
                              )}
                            >
                              <span className="flex items-start gap-2.5">
                                <ShieldCheck
                                  className={cn(
                                    "mt-0.5 h-5 w-5 shrink-0 transition-colors",
                                    draft.womenOnlyPreference ? "text-emerald-600" : "text-slate-400 dark:text-slate-500"
                                  )}
                                  strokeWidth={2}
                                />
                                <span>
                                  <span className="block text-sm font-semibold text-slate-900 dark:text-slate-50">Women-only matching</span>
                                  <span className="mt-0.5 block text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">Match only with verified women</span>
                                </span>
                              </span>
                              <span
                                className={cn(
                                  "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                                  draft.womenOnlyPreference ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700 ring-hairline"
                                )}
                              >
                                <motion.span
                                  layout
                                  transition={SPRING_TACTILE}
                                  className={cn(
                                    "h-5 w-5 rounded-full bg-white dark:bg-slate-900 shadow-card",
                                    draft.womenOnlyPreference ? "ml-[22px]" : "ml-0.5"
                                  )}
                                />
                              </span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <AnimatePresence initial={false}>
                        {formError && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            role="alert"
                            className="overflow-hidden text-[12px] text-red-600"
                          >
                            <span className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 px-3 py-2.5 ring-1 ring-inset ring-red-500/20">
                              <AlertTriangle className="mt-px h-4 w-4 shrink-0" strokeWidth={2.2} />
                              {formError}
                            </span>
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="mt-6 flex items-center gap-3">
                      <Tactile
                        onClick={handleBack}
                        disabled={submitting}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800 px-4 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-200 dark:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-400 disabled:opacity-80"
                      >
                        <ArrowLeft className="h-4 w-4" strokeWidth={2.4} /> Back
                      </Tactile>
                      <Tactile
                        onClick={submit}
                        disabled={submitting}
                        className="group relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-emerald-500 px-4 py-3.5 text-sm font-semibold text-white shadow-brand transition-all hover:bg-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-80"
                      >
                        {!submitting && (
                          <span aria-hidden="true" className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/20 dark:bg-white/10 animate-shimmer" />
                        )}
                        {submitting ? (
                          <>
                            <Loader className="relative h-4 w-4 animate-spin" strokeWidth={2.6} />
                            <span className="relative">Reserving your spot</span>
                          </>
                        ) : (
                          <>
                            <span className="relative">Claim priority access</span>
                            <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.4} />
                          </>
                        )}
                      </Tactile>
                    </div>

                    <p className="mt-4 text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      No spam. We only message you when your corridor opens.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * The input shell. On paper a field has to read as *recessed* — a slightly
 * sunken fill plus a stronger inset hairline — because a white input on a white
 * card is invisible. The focus ring lands on the shell rather than the input, so
 * the icon and the caret are inside the highlighted region.
 */
function fieldShell(invalid: boolean) {
  return cn(
    "group relative flex items-center rounded-2xl bg-black/5 dark:bg-white/5 transition-all duration-200 focus-within:bg-white/80 dark:focus-within:bg-white/10",
    invalid
      ? "ring-1 ring-inset ring-red-500/40 focus-within:ring-2 focus-within:ring-red-500/60"
      : "ring-hairline-strong focus-within:ring-2 focus-within:ring-emerald-500/60",
  );
}

const inputClass =
  "w-full bg-transparent px-4 py-3 text-sm text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors duration-200";

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300"
      >
        {label}
      </label>
      {children}
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden text-[11px] text-red-600"
          >
            <span className="mt-1.5 block">{error}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Matches the form's resting height so hydration doesn't shift the hero. */
function CardSkeleton() {
  return (
    <div
      id="waitlist"
      aria-hidden="true"
      className="min-h-[30rem] w-full animate-pulse rounded-[26px] bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl shadow-slate-200/50 dark:shadow-none ring-1 ring-white/40 dark:ring-white/10"
    />
  );
}
