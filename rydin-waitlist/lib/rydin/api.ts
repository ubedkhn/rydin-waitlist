import type { Gender, TelemetrySnapshot } from "./types";

/**
 * Client for the Express/MongoDB backend in `server/`.
 *
 * Two design rules, both deliberate:
 *
 *  1. **Never throw at the call site.** Every function returns a discriminated
 *     result. A waitlist page whose backend is down must still issue a pass —
 *     the reader did nothing wrong — so the provider falls back to a
 *     deterministic local position and the pass records `origin: "local"`.
 *  2. **Always time out.** A hung TCP connection is worse than a fast failure:
 *     it holds the submit button in a spinner indefinitely. Every request is
 *     aborted after `TIMEOUT_MS`.
 *
 * `NEXT_PUBLIC_API_BASE_URL` is empty by default, which makes the paths
 * relative — correct when the Next app and the API sit behind one origin or a
 * rewrite. Point it at `http://localhost:4000` to run the two separately.
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");

const TIMEOUT_MS = 8_000;

export interface WaitlistSubmission {
  username: string;
  email: string;
  route: string;
  gender: Gender;
  womenOnlyPreference: boolean;
  /** Referral code of whoever sent this reader here, if any. */
  referredBy?: string;
}

/** The `data` block the backend returns on 201 (and on a 200 replay). */
export interface WaitlistResponse {
  passId: string;
  referralCode: string;
  referralLink: string;
  queuePosition: number;
  totalInQueue: number;
  institutionVerified: boolean;
  womenOnlyPreference: boolean;
  routeCode: string;
  joinedAt: string;
  /** True when this email was already on the list — same pass, replayed. */
  alreadyJoined: boolean;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      /**
       * `offline` — no response at all (server down, DNS, CORS, abort). The
       * caller should fall back silently.
       * `rejected` — the server answered and said no (validation, rate limit).
       * The caller must surface the message rather than pretend it worked.
       */
      kind: "offline" | "rejected";
      status?: number;
      message: string;
      /** Present on 429, in seconds, taken from `Retry-After`. */
      retryAfter?: number;
    };

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    // Read the body once, defensively: a proxy 502 is HTML, not JSON.
    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }

    if (!res.ok) {
      const parsed = body as { message?: string; error?: string } | null;
      const retryHeader = Number(res.headers.get("Retry-After"));
      return {
        ok: false,
        // 5xx means the server exists but is broken — treat it like being
        // offline so the reader still gets a pass instead of a red error.
        kind: res.status >= 500 ? "offline" : "rejected",
        status: res.status,
        message:
          parsed?.message ??
          parsed?.error ??
          `Request failed with status ${res.status}.`,
        retryAfter: Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader : undefined,
      };
    }

    const parsed = body as { data?: T } | null;
    if (!parsed || parsed.data === undefined) {
      return { ok: false, kind: "offline", message: "Malformed response from the server." };
    }
    return { ok: true, data: parsed.data };
  } catch {
    // Abort, network failure, CORS rejection — indistinguishable from here,
    // and all handled the same way.
    return {
      ok: false,
      kind: "offline",
      message: "Could not reach the server.",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** `POST /api/waitlist` — the one write this page makes. */
export function submitWaitlist(
  payload: WaitlistSubmission,
): Promise<ApiResult<WaitlistResponse>> {
  return request<WaitlistResponse>("/api/waitlist", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * `GET /api/waitlist/stats` — feeds the telemetry strip.
 *
 * Served from the backend's short-TTL cache, so calling it on mount at 5k RPM
 * costs one Mongo round trip per TTL window rather than one per reader.
 */
export function fetchTelemetry(): Promise<ApiResult<TelemetrySnapshot>> {
  return request<TelemetrySnapshot>("/api/waitlist/stats", { method: "GET" });
}

/** `GET /api/waitlist/position?email=…` — the "Check my spot" lookup. */
export function lookupByEmail(
  email: string,
): Promise<ApiResult<WaitlistResponse>> {
  return request<WaitlistResponse>(
    `/api/waitlist/position?email=${encodeURIComponent(email.trim().toLowerCase())}`,
    { method: "GET" },
  );
}
