"use strict";

const mongoose = require("mongoose");
const env = require("./env");

/* ================================================================== *
 * MongoDB connection.
 *
 * The whole file is about one thing: never letting a request wait on a
 * connection that is not going to arrive. Three settings do that work.
 *
 *  - `maxPoolSize` — the ceiling on concurrent sockets *per worker*. This
 *    is the single most important number for the 5k RPM target. Node
 *    multiplexes queries over the pool; without enough sockets, requests
 *    queue in the driver and latency climbs while the CPU sits idle.
 *  - `minPoolSize` — sockets kept warm. A TLS handshake to Atlas costs
 *    tens of milliseconds, and paying that on the first request after a
 *    quiet spell is a visible spike on the very request you care about.
 *  - `serverSelectionTimeoutMS` — how long a query waits for a reachable
 *    node before failing. Bounded on purpose: a fast 503 that the
 *    frontend can degrade around beats a socket that hangs for 30 s.
 * ================================================================== */

/**
 * `bufferCommands: false` — fail fast instead of queueing.
 *
 * Mongoose's default is to buffer queries issued before the connection is up and
 * flush them on connect. Under load that is a trap: if Mongo is down, thousands
 * of requests accumulate in memory and then all fire at once when it returns,
 * producing a thundering herd on top of an outage. Failing immediately lets the
 * route return 503 and lets the frontend fall back to a local pass.
 */
mongoose.set("bufferCommands", false);

/**
 * `strictQuery: true` — an unknown field in a filter is a bug, not a
 * silently-empty result set.
 */
mongoose.set("strictQuery", true);

/**
 * `autoIndex` only outside production.
 *
 * Index builds are triggered per process. With four workers booting at once in
 * production that is four concurrent `createIndex` calls against the same
 * collection on every deploy. Indexes are created once by `npm run ensure-indexes`
 * (see README) or by the first dev boot.
 */
const autoIndex = !env.isProduction;

let connectPromise = null;

/** Idempotent. Concurrent callers share one in-flight connection attempt. */
function connect() {
  if (connectPromise) return connectPromise;

  connectPromise = mongoose
    .connect(env.mongo.uri, {
      maxPoolSize: env.mongo.maxPoolSize,
      minPoolSize: env.mongo.minPoolSize,
      serverSelectionTimeoutMS: env.mongo.serverSelectionTimeoutMS,
      socketTimeoutMS: env.mongo.socketTimeoutMS,
      maxIdleTimeMS: env.mongo.maxIdleTimeMS,
      compressors: env.mongo.compressors,
      autoIndex,
      // Acknowledged by the primary only. The waitlist is not a ledger: waiting
      // for a majority commit on every signup doubles write latency to buy a
      // durability guarantee this data does not need.
      writeConcern: { w: 1 },
      // Reads are counts and single-document lookups; the primary has them.
      readPreference: "primaryPreferred",
      family: 4,
    })
    .then((m) => {
      console.log(
        `[db] connected pid=${process.pid} pool=${env.mongo.minPoolSize}-${env.mongo.maxPoolSize} db=${m.connection.name}`,
      );
      return m.connection;
    })
    .catch((err) => {
      // Clear the memo so a later attempt can genuinely retry.
      connectPromise = null;
      throw err;
    });

  return connectPromise;
}

/** True when queries can be issued right now. Used by `/healthz`. */
function isConnected() {
  return mongoose.connection.readyState === 1;
}

async function disconnect() {
  connectPromise = null;
  if (mongoose.connection.readyState === 0) return;
  await mongoose.connection.close(false);
}

// Connection lifecycle. Logged, not handled: the driver reconnects on its own,
// and swallowing these events is how a silent outage happens.
mongoose.connection.on("error", (err) => {
  console.error(`[db] error pid=${process.pid}`, err.message);
});
mongoose.connection.on("disconnected", () => {
  console.warn(`[db] disconnected pid=${process.pid}`);
});
mongoose.connection.on("reconnected", () => {
  console.log(`[db] reconnected pid=${process.pid}`);
});

module.exports = { connect, disconnect, isConnected, mongoose };
