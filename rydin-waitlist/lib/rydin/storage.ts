import type { QueuePassRecord } from "./types";

/**
 * Versioned in the key as well as in the payload.
 *
 * The v1 shape collected fullName/mobile/hubId; v2 collects username/email/
 * route/gender. Changing the key means a returning reader with a v1 pass gets a
 * clean slate instead of a card rendered against fields that no longer exist —
 * and the old value is left in place rather than silently destroyed.
 */
const STORAGE_KEY = "rydin.waitlist.v2";

/** Keys from superseded shapes, cleared on first successful v2 write. */
const LEGACY_KEYS = ["rydin.waitlist.v1"];

/**
 * All access is wrapped: Safari private browsing throws on localStorage, and a
 * page that cannot remember a pass should still render rather than blank out.
 */
export function readPass(): QueuePassRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QueuePassRecord;

    // Discard anything written by an older shape rather than rendering it
    // half-empty. Every field the pass actually prints is checked.
    if (
      parsed?.version !== 2 ||
      typeof parsed.passId !== "string" ||
      typeof parsed.referralCode !== "string" ||
      typeof parsed.username !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.route !== "string" ||
      typeof parsed.basePosition !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writePass(record: QueuePassRecord): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    for (const key of LEGACY_KEYS) window.localStorage.removeItem(key);
  } catch {
    // Storage disabled or full. The pass still lives in React state for this
    // session, so there is nothing to recover from here.
  }
}

export function clearPass(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* no-op */
  }
}
