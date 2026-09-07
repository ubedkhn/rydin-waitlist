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
import {
  submitToFirestoreWaitlist,
  lookupFirestoreWaitlistUser,
  getLiveFirestoreCount,
} from "@/lib/rydin/firestoreWaitlist";
import { testConnection } from "@/lib/firebase";
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

  // Rehydrate once on mount & test Firestore connection.
  useEffect(() => {
    setPass(readPass());
    setHydrated(true);

    // Boot-time Firestore connection verification
    void testConnection();

    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("ref");
    const fromPath = window.location.pathname.match(/^\/r\/([A-Za-z0-9]{4,12})$/)?.[1];
    const code = (fromQuery ?? fromPath ?? "").trim().toUpperCase();
    if (code) referredBy.current = code;
  }, []);

  /**
   * Live counters from Firestore.
   */
  useEffect(() => {
    let cancelled = false;

    const pull = async () => {
      if (document.hidden) return;
      try {
        const liveCount = await getLiveFirestoreCount();
        if (cancelled) return;
        setTelemetry((current) => {
          const commuters = Math.max(QUEUE.baseCount, liveCount, current.commuters);
          return {
            ...current,
            commuters,
            monthlyFuelSavings: Math.max(
              projectedPooledSavings(QUEUE.baseCount),
              projectedPooledSavings(commuters),
            ),
          };
        });
      } catch {
        // Silently preserve current telemetry if network hiccup
      }
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
      // 1. Submit directly to Cloud Firestore collection 'waitlist_users'
      const firestoreResult = await submitToFirestoreWaitlist({
        username,
        email,
        route,
        gender,
        women_only_preference: womenOnlyPreference,
      });

      const record: QueuePassRecord = {
        ...localFallback,
        passId: firestoreResult.docId || makePassId(seed),
        referralCode: firestoreResult.referral_code,
        basePosition: firestoreResult.queue_position,
        routeCode: routeCodeFor(route),
        institutionVerified: isInstitutionalEmail(email),
        womenOnlyPreference: firestoreResult.women_only_preference,
        joinedAt: firestoreResult.joined_at || new Date().toISOString(),
        origin: "server",
      };

      setPass(record);
      writePass(record);

      setTelemetry((current) => {
        const commuters = Math.max(QUEUE.baseCount, record.basePosition, current.commuters);
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
        alreadyJoined: firestoreResult.alreadyJoined,
        degraded: false,
      };
    } catch (error) {
      console.error("Firestore submit error, falling back to local session pass:", error);
      // Even if Firestore hits an error or offline network, issue a provisional local pass
      setPass(localFallback);
      writePass(localFallback);

      return {
        ok: true,
        record: localFallback,
        alreadyJoined: false,
        degraded: true,
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

      try {
        const fsUser = await lookupFirestoreWaitlistUser(query);
        if (fsUser) {
          const record: QueuePassRecord = {
            version: 2,
            username: fsUser.username || sameDevice?.username || query.slice(0, query.indexOf("@")),
            email: query,
            route: fsUser.route || sameDevice?.route || "",
            routeCode: routeCodeFor(fsUser.route || sameDevice?.route || ""),
            gender: (fsUser.gender as Gender) || sameDevice?.gender || "other",
            womenOnlyPreference: fsUser.women_only_preference,
            institutionVerified: isInstitutionalEmail(query),
            passId: fsUser.docId || sameDevice?.passId || "FS-PASS",
            referralCode: fsUser.referral_code,
            basePosition: fsUser.queue_position,
            referrals: sameDevice?.referrals ?? 0,
            joinedAt: fsUser.joined_at || new Date().toISOString(),
            origin: "server",
          };
          setPass(record);
          writePass(record);
          return record;
        }
      } catch (err) {
        console.warn("Firestore email lookup failed:", err);
      }

      // Fallback to whatever this device remembers if not found in Firestore or offline
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
