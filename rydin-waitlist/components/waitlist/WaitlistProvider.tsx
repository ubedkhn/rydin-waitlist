"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  computeStanding,
  makeBasePosition,
  makeIdentitySeed,
  makePassId,
  makeReferralCode,
  projectedPooledSavings,
  type QueueStanding,
} from "@/lib/rydin/calc";
import { QUEUE, routeCodeFor } from "@/lib/rydin/constants";
import { clearPass, readPass, writePass } from "@/lib/rydin/storage";
import { isInstitutionalEmail, normalise } from "@/lib/rydin/validate";
import { fetchTelemetry, lookupByEmail, submitWaitlist } from "@/lib/rydin/api";
import type {
  Gender,
  QueuePassRecord,
  TelemetrySnapshot,
  WaitlistDraft,
} from "@/lib/rydin/types";

/* ================================================================== *
 * WaitlistProvider
 *
 * One source of truth for "have you joined" and for the live counters.
 * The header's lookup modal, the hero card, the telemetry strip and the
 * sticky CTA all read it, so they can never fall out of sync — the class
 * of bug where the sticky bar still says "Join" after you already hold a
 * pass, or where two counters on the same page disagree.
 * ================================================================== */

export const EMPTY_DRAFT: WaitlistDraft = {
  username: "",
  email: "",
  route: "",
  gender: "",
  womenOnlyPreference: false,
};

/**
 * The telemetry object the whole strip reads from.
 *
 * Seeded from the hardcoded floor — 200 commuters — and derived, not typed
 * twice: the pooled fuel saving is a function of the commuter count, so the two
 * cells cannot drift apart. Live backend stats replace this wholesale.
 */
const INITIAL_TELEMETRY: TelemetrySnapshot = {
  commuters: QUEUE.baseCount,
  monthlyFuelSavings: projectedPooledSavings(QUEUE.baseCount),
  activeCorridors: QUEUE.activeCorridors,
};

/** How often the page re-reads live stats while the tab is visible. */
const TELEMETRY_POLL_MS = 45_000;

export type JoinResult =
  | {
      ok: true;
      record: QueuePassRecord;
      /** True when this email was already on the list — same pass, replayed. */
      alreadyJoined: boolean;
      /**
       * True when the backend could not be reached and the position was issued
       * locally. The pass says so on its face rather than quietly inventing a
       * number and presenting it as authoritative.
       */
      degraded: boolean;
    }
  | { ok: false; message: string };

interface WaitlistContextValue {
  /** Null until joined. */
  pass: QueuePassRecord | null;
  /** Derived position, jumps, and totals. Null when there is no pass. */
  standing: QueueStanding | null;
  /**
   * False during the first client render. localStorage is unreadable on the
   * server, so the card renders its form until hydration settles — without
   * this flag it would flash the form for someone who already holds a pass.
   */
  hydrated: boolean;
  /**
   * Live metrics. Never below the 200 floor, and the single object every
   * counter on the page reads — there is no second copy of these numbers.
   */
  telemetry: TelemetrySnapshot;
  /** True while a submission is in flight. */
  submitting: boolean;
  /** Issues a pass from a completed draft and persists it. */
  join: (draft: WaitlistDraft) => Promise<JoinResult>;
  /** Simulates a confirmed invite. */
  addReferral: () => void;
  /** Clears the stored pass and returns the card to its form. */
  reset: () => void;
  /** Looks up a pass by email — server first, local pass as fallback. */
  lookup: (email: string) => Promise<QueuePassRecord | null>;
  /** Scrolls the waitlist card into view and focuses its first field. */
  focusForm: () => void;
}

const WaitlistContext = createContext<WaitlistContextValue | null>(null);

export function WaitlistProvider({ children }: { children: ReactNode }) {
  const [pass, setPass] = useState<QueuePassRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>(INITIAL_TELEMETRY);

  /**
   * Referral code from `?ref=` / `/r/<code>`, forwarded with the submission so
   * the backend can credit whoever sent this reader here. A ref rather than
   * state: it never re-renders anything.
   */
  const referredBy = useRef<string | undefined>(undefined);

  // Rehydrate once on mount.
  useEffect(() => {
    setPass(readPass());
    setHydrated(true);

    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("ref");
    const fromPath = window.location.pathname.match(/^\/r\/([A-Za-z0-9]{4,12})$/)?.[1];
    const code = (fromQuery ?? fromPath ?? "").trim().toUpperCase();
    if (code) referredBy.current = code;
  }, []);

  /**
   * Live counters, from the backend.
   *
   * There is deliberately no ambient "+1 every few seconds" ticker here. On a
   * queue of 200 a fake ticker would add a hundred people in ten minutes and
   * the number would be visibly fictional. Instead the count moves for exactly
   * two reasons: this page's own successful submission, and a real figure
   * polled from Mongo. Polling pauses while the tab is hidden.
   */
  useEffect(() => {
    let cancelled = false;

    const pull = async () => {
      if (document.hidden) return;
      const result = await fetchTelemetry();
      if (cancelled || !result.ok) return;
      setTelemetry((current) => ({
        // The floor is a floor, including against the server: a fresh database
        // reporting 3 commuters must not walk the headline number backwards.
        commuters: Math.max(QUEUE.baseCount, result.data.commuters, current.commuters),
        monthlyFuelSavings: Math.max(
          projectedPooledSavings(QUEUE.baseCount),
          result.data.monthlyFuelSavings,
        ),
        activeCorridors: Math.max(1, result.data.activeCorridors),
      }));
    };

    void pull();
    const timer = setInterval(pull, TELEMETRY_POLL_MS);
    const onVisible = () => void pull();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const join = useCallback(async (draft: WaitlistDraft): Promise<JoinResult> => {
    // The select cannot be submitted empty (validateAll blocks it), but the
    // type allows "", so narrow rather than cast.
    if (draft.gender === "") {
      return { ok: false, message: "Select an option for gender." };
    }
    const gender: Gender = draft.gender;

    const username = normalise(draft.username);
    const email = draft.email.trim().toLowerCase();
    const route = normalise(draft.route);
    // Re-asserted here, not trusted from the UI: the toggle is only reachable
    // for female commuters, and this is the line that guarantees it. The backend
    // asserts the same rule again on its own side.
    const womenOnlyPreference = gender === "female" && draft.womenOnlyPreference;

    const seed = makeIdentitySeed(username, email);
    const localFallback: QueuePassRecord = {
      version: 2,
      username,
      email,
      route,
      routeCode: routeCodeFor(route),
      gender,
      womenOnlyPreference,
      institutionVerified: isInstitutionalEmail(email),
      passId: makePassId(seed),
      referralCode: makeReferralCode(seed),
      basePosition: makeBasePosition(seed),
      referrals: 0,
      joinedAt: new Date().toISOString(),
      origin: "local",
    };

    setSubmitting(true);
    try {
      const result = await submitWaitlist({
        username,
        email,
        route,
        gender,
        womenOnlyPreference,
        referredBy: referredBy.current,
      });

      // The server answered and refused — a validation error or a rate limit.
      // Surface it; do not paper over it with a fabricated pass.
      if (!result.ok && result.kind === "rejected") {
        return { ok: false, message: result.message };
      }

      const record: QueuePassRecord = result.ok
        ? {
            ...localFallback,
            passId: result.data.passId,
            referralCode: result.data.referralCode,
            basePosition: result.data.queuePosition,
            routeCode: result.data.routeCode,
            institutionVerified: result.data.institutionVerified,
            womenOnlyPreference: result.data.womenOnlyPreference,
            joinedAt: result.data.joinedAt,
            origin: "server",
          }
        : localFallback;

      setPass(record);
      writePass(record);

      setTelemetry((current) => {
        // A replayed submission must not inflate the counter — the same person
        // joining twice is one commuter.
        const alreadyCounted = result.ok && result.data.alreadyJoined;
        const commuters = result.ok
          ? Math.max(QUEUE.baseCount, result.data.totalInQueue, current.commuters)
          : current.commuters + (alreadyCounted ? 0 : 1);
        return {
          ...current,
          commuters,
          monthlyFuelSavings: Math.max(
            current.monthlyFuelSavings,
            projectedPooledSavings(commuters),
          ),
        };
      });

      return {
        ok: true,
        record,
        alreadyJoined: result.ok ? result.data.alreadyJoined : false,
        degraded: !result.ok,
      };
    } finally {
      setSubmitting(false);
    }
  }, []);

  const addReferral = useCallback(() => {
    setPass((current) => {
      if (!current) return current;
      const next = { ...current, referrals: current.referrals + 1 };
      writePass(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    clearPass();
    setPass(null);
  }, []);

  const lookup = useCallback(
    async (email: string): Promise<QueuePassRecord | null> => {
      const query = email.trim().toLowerCase();
      if (!query.includes("@")) return null;

      const remembered = pass ?? readPass();
      const sameDevice =
        remembered && remembered.email.toLowerCase() === query ? remembered : null;

      const result = await lookupByEmail(query);
      if (result.ok) {
        // The server is authoritative for the position and the codes. Anything
        // it does not store — the username and route as typed — is taken from
        // this device when it is the same person, so the recovered stub is not
        // half blank.
        const record: QueuePassRecord = {
          version: 2,
          username: sameDevice?.username ?? query.slice(0, query.indexOf("@")),
          email: query,
          route: sameDevice?.route ?? "",
          routeCode: result.data.routeCode,
          gender: sameDevice?.gender ?? "other",
          womenOnlyPreference: result.data.womenOnlyPreference,
          institutionVerified: result.data.institutionVerified,
          passId: result.data.passId,
          referralCode: result.data.referralCode,
          basePosition: result.data.queuePosition,
          referrals: sameDevice?.referrals ?? 0,
          joinedAt: result.data.joinedAt,
          origin: "server",
        };
        setPass(record);
        writePass(record);
        return record;
      }

      // Server unreachable, or no such address — fall back to whatever this
      // device remembers.
      return sameDevice;
    },
    [pass],
  );

  const focusForm = useCallback(() => {
    const node = document.getElementById("waitlist");
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
    // Focus after the smooth scroll has begun, so the browser doesn't jump.
    window.setTimeout(() => {
      document.getElementById("rydin-username")?.focus({ preventScroll: true });
    }, 520);
  }, []);

  const standing = useMemo(() => (pass ? computeStanding(pass) : null), [pass]);

  const value = useMemo<WaitlistContextValue>(
    () => ({
      pass,
      standing,
      hydrated,
      telemetry,
      submitting,
      join,
      addReferral,
      reset,
      lookup,
      focusForm,
    }),
    [
      pass,
      standing,
      hydrated,
      telemetry,
      submitting,
      join,
      addReferral,
      reset,
      lookup,
      focusForm,
    ],
  );

  return (
    <WaitlistContext.Provider value={value}>{children}</WaitlistContext.Provider>
  );
}

export function useWaitlist(): WaitlistContextValue {
  const ctx = useContext(WaitlistContext);
  if (!ctx) {
    throw new Error("useWaitlist must be used inside <WaitlistProvider>.");
  }
  return ctx;
}
