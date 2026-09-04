"use strict";

/* ================================================================== *
 * Environment.
 *
 * Read once, validated once, frozen. Anything that can be wrong is
 * caught at boot rather than on the first request under load — a
 * misparsed pool size discovered at 5,000 RPM is an outage, the same
 * mistake discovered at startup is a log line.
 * ================================================================== */

require("dotenv").config();

const os = require("node:os");

function int(name, fallback, { min, max } = {}) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be an integer, received "${raw}".`);
  }
  if (min !== undefined && value < min) {
    throw new Error(`${name} must be >= ${min}, received ${value}.`);
  }
  if (max !== undefined && value > max) {
    throw new Error(`${name} must be <= ${max}, received ${value}.`);
  }
  return value;
}

function bool(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return /^(1|true|yes|on)$/i.test(raw);
}

function list(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const NODE_ENV = process.env.NODE_ENV || "development";
const isProduction = NODE_ENV === "production";

/*
 * Worker count.
 *
 * One process per core by default. Node is single-threaded, so a 4-core box
 * running one process caps at roughly a quarter of the throughput it could
 * reach — and 5,000 RPM (~83 req/s) is comfortably inside reach for four
 * workers, but only if they exist.
 */
const cpuCount = os.availableParallelism ? os.availableParallelism() : os.cpus().length;

/*
 * Mongo pool size, per worker.
 *
 * The number that matters is workers × maxPoolSize — that is what Mongo sees.
 * 25 × 4 workers = 100 connections, which sits inside the 500-connection limit
 * of an Atlas M10 with room for tooling. Sizing this is a balance: too small and
 * requests queue behind a free socket at peak, too large and every worker fights
 * for the server's own connection budget.
 *
 * At 83 req/s with a ~5 ms indexed write, Little's law says the steady-state
 * need is under one connection. The pool exists for the bursts, not the mean.
 */
const dbMaxPoolSize = int("MONGO_MAX_POOL_SIZE", 25, { min: 5, max: 500 });
const dbMinPoolSize = int("MONGO_MIN_POOL_SIZE", 5, { min: 0, max: dbMaxPoolSize });

const env = Object.freeze({
  NODE_ENV,
  isProduction,

  port: int("PORT", 4000, { min: 1, max: 65535 }),
  workers: int("WEB_CONCURRENCY", cpuCount, { min: 1, max: 64 }),

  /** Trust N reverse proxies for `req.ip`. 0 disables — see app.js. */
  trustProxyHops: int("TRUST_PROXY_HOPS", isProduction ? 1 : 0, { min: 0, max: 10 }),

  mongo: {
    uri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/rydin",
    maxPoolSize: dbMaxPoolSize,
    minPoolSize: dbMinPoolSize,
    /** Give up finding a socket rather than piling up requests forever. */
    serverSelectionTimeoutMS: int("MONGO_SERVER_SELECTION_TIMEOUT_MS", 5_000, { min: 500 }),
    socketTimeoutMS: int("MONGO_SOCKET_TIMEOUT_MS", 20_000, { min: 1_000 }),
    /** Recycle idle sockets so a quiet night doesn't hold 100 open connections. */
    maxIdleTimeMS: int("MONGO_MAX_IDLE_TIME_MS", 60_000, { min: 0 }),
    /** Compression pays for itself on documents this small only over the wire. */
    compressors: list("MONGO_COMPRESSORS", ["zstd", "snappy", "zlib"]),
  },

  /**
   * The queue floor, mirrored from the frontend's `QUEUE.baseCount`.
   *
   * The counter in Mongo starts at 0 and this is added to it, so the first
   * person to join is #201 and the page's hardcoded 200 is never contradicted.
   * If you change it here, change it in `lib/rydin/constants.ts` too.
   */
  queueBaseCount: int("QUEUE_BASE_COUNT", 200, { min: 0 }),

  rateLimit: {
    /** Window for the write limiter. */
    writeWindowMs: int("RATE_LIMIT_WRITE_WINDOW_MS", 60 * 60 * 1000, { min: 1_000 }),
    /** Signups per IP per window. A household NAT should still get through. */
    writeMax: int("RATE_LIMIT_WRITE_MAX", 8, { min: 1 }),
    /** Window for reads. */
    readWindowMs: int("RATE_LIMIT_READ_WINDOW_MS", 60 * 1000, { min: 1_000 }),
    /**
     * Reads per IP per minute. Generous: the page polls stats every 45 s, and a
     * shared campus NAT can put hundreds of readers behind one address.
     */
    readMax: int("RATE_LIMIT_READ_MAX", 240, { min: 1 }),
    /** Optional shared store. Without it each worker counts separately. */
    redisUrl: process.env.RATE_LIMIT_REDIS_URL || "",
  },

  /** Allowed browser origins. Empty in dev means "reflect anything". */
  corsOrigins: list("CORS_ORIGINS", isProduction ? ["https://rydinapp.com"] : []),

  /** TTL of the in-process stats cache. One Mongo hit per window, per worker. */
  statsCacheMs: int("STATS_CACHE_MS", 15_000, { min: 0 }),

  /** Log every request. Off by default — at 5k RPM this is 7.2M lines a day. */
  logRequests: bool("LOG_REQUESTS", false),
});

module.exports = env;
