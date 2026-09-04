"use strict";

const env = require("./env");

/* ================================================================== *
 * Queue economics — server copy of `QUEUE` in
 * `lib/rydin/constants.ts`.
 *
 * Only the figures the server actually computes with are here. The tier
 * ladder and the leaderboard are presentation and stay on the client.
 *
 * `baseCount` lives in `env.js` rather than this file because it is the
 * one figure a deployment legitimately overrides — a staging database
 * starting from 0 rather than 200 is useful. The rest are product
 * decisions, not deployment settings, so they are constants: an operator
 * being able to quietly change what a referral is worth via an
 * environment variable would make two servers behind the same load
 * balancer disagree about a reader's position.
 * ================================================================== */

const QUEUE = Object.freeze({
  /** Mirrors `env.queueBaseCount`. The floor under every position. */
  baseCount: env.queueBaseCount,

  /**
   * Pooled monthly fuel saving attributed to each commuter in the queue.
   *
   * The telemetry strip shows `commuters × this`, so the saving figure is a pure
   * function of the count and the two cells can never contradict each other.
   * Change it here and in `lib/rydin/constants.ts` together.
   */
  projectedMonthlySavingPerCommuter: 340,

  /**
   * The corridor count the page advertises before any live data arrives.
   *
   * Used as a floor in the stats service. Without it, the first signup on a
   * fresh database would report one distinct corridor and the strip would count
   * *down* from 4 to 1 the moment the backend came online — a true number
   * presented as a regression. Mirrors `QUEUE.activeCorridors`.
   */
  baseCorridors: 4,

  /** Spots gained per confirmed invite. Mirrors the client. */
  spotsPerReferral: 15,

  /** Instant jump for a verified campus or corporate domain. */
  institutionalJump: 45,
});

module.exports = QUEUE;
