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

export function WaitlistCard() {
  const { pass, standing, hydrated, submitting, join, addReferral, reset } =
    useWaitlist();

  const [draft, setDraft] = useState<WaitlistDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<FieldErrors>({});
  /** Server-side refusal — a rate limit or a validation error we didn't catch. */
  const [formError, setFormError] = useState<string | null>(null);

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
    if (!result.ok) setFormError(result.message);
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
      <AnimatePresence mode="wait" initial={false}>
        {pass && standing ? (
          <motion.div key="pass">
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
            className="relative overflow-hidden rounded-[26px] bg-paper-raise p-5 shadow-lift ring-hairline sm:p-6"
          >
            {/* Header: what this form is, and what it costs to fill in. */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-slate-900">
                  Reserve your spot
                </h2>
                <p className="mt-0.5 text-[12px] text-slate-500">
                  Four questions. No password, no OTP, no card.
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-brand-700 ring-1 ring-inset ring-brand-500/20">
                Batch 1
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {/* 1 — Username */}
              <Field label="Username" htmlFor="rydin-username" error={errors.username}>
                <div className={fieldShell(!!errors.username)}>
                  <UserRound
                    className="ml-3.5 h-4 w-4 shrink-0 text-slate-400"
                    strokeWidth={2.1}
                    aria-hidden="true"
                  />
                  <input
                    id="rydin-username"
                    type="text"
                    value={draft.username}
                    onChange={(e) => set("username", e.target.value)}
                    onBlur={() => checkOnBlur("username")}
                    placeholder="What co-riders will see"
                    autoComplete="nickname"
                    maxLength={24}
                    aria-invalid={!!errors.username}
                    className={inputClass}
                  />
                </div>
              </Field>

              {/* 2 — Email */}
              <Field label="Email ID" htmlFor="rydin-email" error={errors.email}>
                <div className={fieldShell(!!errors.email)}>
                  <AtSign
                    className="ml-3.5 h-4 w-4 shrink-0 text-slate-400"
                    strokeWidth={2.1}
                    aria-hidden="true"
                  />
                  <input
                    id="rydin-email"
                    type="email"
                    value={draft.email}
                    onChange={(e) => set("email", e.target.value)}
                    onBlur={() => checkOnBlur("email")}
                    placeholder="you@college.edu or you@gmail.com"
                    autoComplete="email"
                    inputMode="email"
                    aria-invalid={!!errors.email}
                    className={inputClass}
                  />
                </div>
                <AnimatePresence initial={false}>
                  {vipUnlocked && !errors.email && (
                    <motion.p
                      key="vip"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden text-[11px] font-medium text-brand-700"
                    >
                      <span className="mt-1.5 flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.3} />
                        Recognised campus or corporate domain — jumping you{" "}
                        {formatCount(QUEUE.institutionalJump)} spots.
                      </span>
                    </motion.p>
                  )}
                </AnimatePresence>
              </Field>

              {/* 3 — Route */}
              <Field label="Route traveled" htmlFor="rydin-route" error={errors.route}>
                <div className={fieldShell(!!errors.route)}>
                  <MapPin
                    className="ml-3.5 h-4 w-4 shrink-0 text-slate-400"
                    strokeWidth={2.1}
                    aria-hidden="true"
                  />
                  <input
                    id="rydin-route"
                    type="text"
                    value={draft.route}
                    onChange={(e) => set("route", e.target.value)}
                    onBlur={() => checkOnBlur("route")}
                    placeholder="Vijay Nagar → Rau"
                    /*
                     * A datalist, not a second control. The launch corridors are
                     * offered as suggestions so density data stays clean, while
                     * someone on a route we haven't opened can still type it —
                     * one field, one answer, no dropdown to fight with.
                     */
                    list="rydin-routes"
                    autoComplete="off"
                    maxLength={80}
                    aria-invalid={!!errors.route}
                    className={inputClass}
                  />
                  <datalist id="rydin-routes">
                    {HUBS.map((hub) => (
                      <option key={hub.id} value={hub.label} />
                    ))}
                  </datalist>
                </div>
                <AnimatePresence initial={false} mode="wait">
                  {matchedRoute && !errors.route && (
                    <motion.p
                      key={matchedRoute.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden text-[11px] leading-relaxed text-slate-500"
                    >
                      <span className="mt-1.5 block">
                        <span className="font-mono text-[10px] font-semibold tracking-wide text-brand-600">
                          {matchedRoute.code}
                        </span>{" "}
                        {matchedRoute.detail}
                      </span>
                    </motion.p>
                  )}
                </AnimatePresence>
              </Field>

              {/* 4 — Gender */}
              <Field label="Gender" htmlFor="rydin-gender" error={errors.gender}>
                <div className={fieldShell(!!errors.gender)}>
                  <Users
                    className="ml-3.5 h-4 w-4 shrink-0 text-slate-400"
                    strokeWidth={2.1}
                    aria-hidden="true"
                  />
                  <select
                    id="rydin-gender"
                    value={draft.gender}
                    onChange={(e) => set("gender", e.target.value as Gender | "")}
                    onBlur={() => checkOnBlur("gender")}
                    aria-invalid={!!errors.gender}
                    className={cn(
                      inputClass,
                      "cursor-pointer pr-9",
                      // A native select renders the placeholder in the same
                      // colour as a real answer, so the empty state is coloured
                      // explicitly to read as unfilled.
                      draft.gender === "" && "text-slate-400",
                    )}
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    {GENDERS.map((g) => (
                      <option key={g.value} value={g.value} className="text-slate-900">
                        {g.label}
                      </option>
                    ))}
                  </select>
                  {/* Our own caret: the OS chrome was stripped in globals.css. */}
                  <ChevronDown
                    className="pointer-events-none absolute right-3.5 h-4 w-4 text-slate-400"
                    strokeWidth={2.2}
                    aria-hidden="true"
                  />
                </div>
              </Field>

              {/*
                Women-Only Matching Mode.
                Revealed only for `gender === "female"`. Height-animated rather
                than toggled, so the card grows into the extra control instead of
                snapping — and it unmounts on any other answer, which is what
                guarantees the preference can't be submitted by someone the mode
                doesn't apply to.
              */}
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
                      onClick={() =>
                        set("womenOnlyPreference", !draft.womenOnlyPreference)
                      }
                      className={cn(
                        "flex w-full items-start justify-between gap-3 rounded-xl px-3.5 py-3 text-left transition-colors",
                        draft.womenOnlyPreference
                          ? "bg-brand-50 ring-1 ring-inset ring-brand-500/25"
                          : "bg-paper-sunken ring-hairline hover:bg-slate-100",
                      )}
                    >
                      <span className="flex items-start gap-2.5">
                        <ShieldCheck
                          className={cn(
                            "mt-0.5 h-5 w-5 shrink-0 transition-colors",
                            draft.womenOnlyPreference
                              ? "text-brand-600"
                              : "text-slate-400",
                          )}
                          strokeWidth={2}
                        />
                        <span>
                          <span className="block text-sm font-medium text-slate-900">
                            Enable Women-Only Matching Mode
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
                            Match exclusively with verified female peers
                          </span>
                        </span>
                      </span>
                      <span
                        className={cn(
                          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                          draft.womenOnlyPreference
                            ? "bg-brand-500"
                            : "bg-slate-200 ring-hairline",
                        )}
                      >
                        <motion.span
                          layout
                          transition={SPRING_TACTILE}
                          className={cn(
                            "h-5 w-5 rounded-full bg-white shadow-card",
                            draft.womenOnlyPreference ? "ml-[22px]" : "ml-0.5",
                          )}
                        />
                      </span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* A refusal from the server: rate limit, or a rule we didn't catch. */}
            <AnimatePresence initial={false}>
              {formError && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  role="alert"
                  className="overflow-hidden text-[12px] text-red-600"
                >
                  <span className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 ring-1 ring-inset ring-red-500/20">
                    <AlertTriangle className="mt-px h-4 w-4 shrink-0" strokeWidth={2.2} />
                    {formError}
                  </span>
                </motion.p>
              )}
            </AnimatePresence>

            {/* Submit */}
            <Tactile
              onClick={submit}
              disabled={submitting}
              className="group relative mt-5 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-b from-brand-400 to-brand-600 px-4 py-3.5 text-sm font-semibold text-white shadow-brand transition-opacity focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-80"
            >
              {!submitting && (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 cta-sheen animate-shimmer"
                />
              )}
              {submitting ? (
                <>
                  <Loader className="relative h-4 w-4 animate-spin" strokeWidth={2.6} />
                  <span className="relative">Reserving your spot</span>
                </>
              ) : (
                <>
                  <span className="relative">Claim priority access</span>
                  <ArrowRight
                    className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    strokeWidth={2.4}
                  />
                </>
              )}
            </Tactile>

            <p className="mt-3 text-center text-[11px] text-slate-500">
              No spam. We only message you when your corridor opens.
            </p>
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
    "relative flex items-center rounded-xl bg-paper-sunken transition-shadow",
    invalid
      ? "ring-1 ring-inset ring-red-500/40 focus-within:ring-2 focus-within:ring-red-500/60"
      : "ring-hairline-strong focus-within:ring-2 focus-within:ring-brand-500/60",
  );
}

const inputClass =
  "w-full bg-transparent px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none";

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
        className="mb-1.5 block text-xs font-medium text-slate-600"
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
      className="min-h-[30rem] w-full animate-pulse rounded-[26px] bg-paper-raise shadow-card ring-hairline"
    />
  );
}
