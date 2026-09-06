"use strict";

const env = require("../config/env");
const QUEUE = require("../config/queue");
const Waitlist = require("../models/Waitlist");
const { peekQueueLength } = require("../models/Counter");
const { CUSTOM_ROUTE_CODE } = require("../config/hubs");

/* ================================================================== *
 * Stats service — the read path for `GET /api/waitlist/stats`.
 *
 * Every reader's browser polls this every 45 seconds, and the page is
 * built to survive 5,000 RPM. Without a cache that is 5,000 Mongo round
 * trips a minute to compute three numbers that barely move — the most
 * expensive endpoint on the server would be the one nobody writes to.
 *
 * Two mechanisms keep it cheap:
 *
 *  1. **A TTL cache** (`STATS_CACHE_MS`, default 15 s). One database read
 *     per window *per worker*, so four workers cost four reads per 15 s
 *     regardless of traffic. Deliberately per-process rather than shared:
 *     a Redis round trip to save a 1 ms indexed read is not a saving, and
 *     a stale-by-15-seconds commuter count is not a correctness problem.
 *  2. **Single-flight.** When the cache expires under load, hundreds of
 *     requests arrive at an empty cache simultaneously. Without this they
 *     would all issue the same query — a cache stampede that turns the
 *     cache into a synchroniser for load spikes. The in-flight promise is
 *     shared, so the hundredth request awaits the first one's query.
 * ================================================================== */

/** @type {{ at: number, data: object } | null} */
let cached = null;

/** @type {Promise<object> | null} */
let inFlight = null;

/**
 * How the three numbers are sourced.
 *
 *  - `commuters` comes from the atomic counter, not `countDocuments()` and not
 *    `estimatedDocumentCount()`. The counter already includes the base floor, is
 *    O(1), and is monotonic — a record deleted for a support request must not
 *    walk the public headline number backwards.
 *  - `monthlyFuelSavings` is derived from `commuters`, never stored, so the two
 *    cells on the strip cannot drift apart.
 *  - `activeCorridors` is a `distinct` on `routeCode`, which is index-covered.
 *    `CSTM` is excluded because it is not a corridor — it is the bucket for
 *    everything we have not opened yet, and counting it would claim a launch
 *    that has not happened.
 */
async function computeStats() {
  const [commuters, routeCodes] = await Promise.all([
    peekQueueLength(),
    Waitlist.distinct("routeCode"),
  ]);

  const openCorridors = routeCodes.filter((code) => code && code !== CUSTOM_ROUTE_CODE);

  return {
    commuters,
    monthlyFuelSavings: commuters * QUEUE.projectedMonthlySavingPerCommuter,
    // Floored at the advertised figure so the count never appears to fall when
    // live data replaces the page's initial state. See config/queue.js.
    activeCorridors: Math.max(QUEUE.baseCorridors, openCorridors.length),
  };
}

/**
 * The snapshot the frontend's `TelemetrySnapshot` expects.
 *
 * Never throws. A stats failure must not take down the strip: the last good
 * snapshot is served if there is one, and the base floor is served if there is
 * not. The reader sees plausible numbers instead of a broken panel, and the
 * error is logged for whoever is on call.
 */
async function getStats() {
  const now = Date.now();

  if (cached && now - cached.at < env.statsCacheMs) {
    return cached.data;
  }

  if (inFlight) return inFlight;

  inFlight = computeStats()
    .then((data) => {
      cached = { at: Date.now(), data };
      return data;
    })
    .catch((err) => {
      console.error(`[stats] read failed pid=${process.pid}`, err.message);
      if (cached) return cached.data;
      return fallbackStats();
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/** The floor, computed the same way the frontend seeds its initial state. */
function fallbackStats() {
  return {
    commuters: QUEUE.baseCount,
    monthlyFuelSavings: QUEUE.baseCount * QUEUE.projectedMonthlySavingPerCommuter,
    activeCorridors: QUEUE.baseCorridors,
  };
}

/**
 * Drop the cache.
 *
 * Called after a successful signup so this worker's next stats read reflects the
 * new commuter immediately rather than up to 15 seconds later. Only this
 * worker's cache — the other three expire on their own, which is exactly the
 * staleness the TTL already licenses.
 */
function invalidate() {
  cached = null;
}

module.exports = { getStats, invalidate, fallbackStats };
