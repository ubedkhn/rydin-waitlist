"use strict";

const rateLimit = require("express-rate-limit");
const env = require("../config/env");

/* ================================================================== *
 * Rate limiting.
 *
 * Two limiters, because a signup and a stats poll are not the same
 * event. One limit tight enough to stop a script from inserting ten
 * thousand rows would also throttle the page's own 45-second poll, and
 * one loose enough for the poll would not stop the script.
 *
 *  - **Write** — 8 signups per IP per hour. A signup is a once-in-a-
 *    lifetime action, so anything above single digits is either a
 *    household behind one NAT (fine, they fit) or automation (not fine).
 *  - **Read** — 240 requests per IP per minute. Generous on purpose: a
 *    campus NAT can put several hundred readers behind one address, and
 *    rate-limiting a shared university gateway would look like an outage
 *    to everyone on it.
 *
 * ------------------------------------------------------------------
 * IMPORTANT — the memory store is per process.
 *
 * The default store lives in one worker's heap. Under `cluster` with four
 * workers, an attacker's requests are round-robined across four
 * independent counters, so the effective limit is 4 × the configured one.
 * That is *bounded*, not unlimited, and for this endpoint it is an
 * acceptable default: 32 signups an hour per IP is still not a bulk
 * insert.
 *
 * To make the limit exact, set `RATE_LIMIT_REDIS_URL`. The Redis store is
 * loaded lazily and its packages are `optionalDependencies`, so a
 * deployment that does not want Redis does not have to install it.
 * ------------------------------------------------------------------
 * ================================================================== */

/**
 * Build a shared store, or return `undefined` to use the per-process memory
 * store.
 *
 * Deliberately fail-soft: if Redis is configured but the packages are missing or
 * the connection cannot be created, the server logs loudly and falls back to
 * memory. A rate limiter is a protective measure — refusing to boot without a
 * perfect one would convert a degraded defence into a total outage.
 */
function buildStore() {
  if (!env.rateLimit.redisUrl) return undefined;

  try {
    // eslint-disable-next-line global-require
    const { RedisStore } = require("rate-limit-redis");
    // eslint-disable-next-line global-require
    const Redis = require("ioredis");

    const client = new Redis(env.rateLimit.redisUrl, {
      // The limiter must never be the thing that hangs a request. If Redis is
      // slow, fail the command fast and let the limiter fall open.
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 2_000,
      lazyConnect: false,
    });

    client.on("error", (err) => {
      console.error(`[ratelimit] redis error pid=${process.pid}`, err.message);
    });

    console.log(`[ratelimit] shared store active pid=${process.pid}`);

    return new RedisStore({
      sendCommand: (...args) => client.call(...args),
      prefix: "rydin:rl:",
    });
  } catch (err) {
    console.error(
      `[ratelimit] redis unavailable, falling back to per-worker memory store: ${err.message}`,
    );
    return undefined;
  }
}

const store = buildStore();

/**
 * The 429 body.
 *
 * Shaped to match every other error this API returns — `{ error, message }` —
 * because the frontend's client reads `message` from any non-2xx response. A
 * limiter that answered in its own private shape would surface as
 * "Request failed with status 429" instead of something a reader can act on.
 */
function limitHandler(req, res) {
  const retryAfterSec = Math.max(1, Math.ceil((req.rateLimit?.resetTime - Date.now()) / 1000) || 60);

  res.setHeader("Retry-After", String(retryAfterSec));
  res.status(429).json({
    error: "rate_limited",
    message: `Too many requests from this network. Try again in ${formatWait(retryAfterSec)}.`,
  });
}

function formatWait(seconds) {
  if (seconds < 90) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

const shared = {
  // `RateLimit-*` headers, per the IETF draft. The legacy `X-RateLimit-*` set is
  // off: two header families saying the same thing is just bytes on every
  // response.
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
  store,
};

/** `POST /api/waitlist`. */
const writeLimiter = rateLimit({
  ...shared,
  windowMs: env.rateLimit.writeWindowMs,
  limit: env.rateLimit.writeMax,
  /**
   * Count only requests that got through.
   *
   * A reader who mistypes their email three times has not consumed three of
   * their eight signups — those attempts never touched the database. Without
   * this, form-fumbling is indistinguishable from abuse.
   */
  skipFailedRequests: true,
});

/** `GET /api/waitlist/stats` and `GET /api/waitlist/position`. */
const readLimiter = rateLimit({
  ...shared,
  windowMs: env.rateLimit.readWindowMs,
  limit: env.rateLimit.readMax,
});

/**
 * `/healthz`.
 *
 * Rate-limited too, but very loosely — an unprotected health endpoint is a free
 * liveness oracle, and a load balancer polling every second from a handful of
 * addresses must never be throttled.
 */
const healthLimiter = rateLimit({
  ...shared,
  windowMs: 60_000,
  limit: 600,
});

module.exports = { writeLimiter, readLimiter, healthLimiter };
