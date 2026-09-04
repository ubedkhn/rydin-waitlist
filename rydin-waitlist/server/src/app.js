"use strict";

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");

const env = require("./config/env");
const db = require("./config/db");
const waitlistRoutes = require("./routes/waitlist.routes");
const { healthLimiter } = require("./middleware/rateLimit");

/* ================================================================== *
 * The Express application.
 *
 * Exported as a factory rather than a listening server so that the
 * cluster entry (`server.js`), the single-process entry (`src/single.js`)
 * and any future test harness all build the same app and differ only in
 * how they bind a port.
 *
 * Middleware order is not decoration — it is the request's cost curve.
 * Everything that can reject a request cheaply runs before anything that
 * allocates: security headers, then CORS (a preflight must never reach a
 * route), then the body parser with a hard ceiling, and only then the
 * router. A 413 or a CORS rejection at 5k RPM should cost microseconds.
 * ================================================================== */

function createApp() {
  const app = express();

  /*
   * `trust proxy`.
   *
   * This decides what `req.ip` is, and `req.ip` is what the rate limiter keys
   * on — so getting it wrong breaks the limiter in one of two ways. Trust
   * nothing behind a proxy and every request appears to come from the load
   * balancer, so the first 8 signups exhaust the limit for the entire internet.
   * Trust blindly and any client can send `X-Forwarded-For: <random>` and get an
   * unlimited number of fresh buckets.
   *
   * The hop count is explicit: trust exactly as many proxies as are actually in
   * front of this process (1 for a single load balancer, 2 behind a CDN plus a
   * balancer), and take the address the innermost trusted hop reported.
   */
  app.set("trust proxy", env.trustProxyHops === 0 ? false : env.trustProxyHops);

  /*
   * ETags off.
   *
   * Express hashes every JSON body to produce one. For responses this small,
   * with a client that never sends `If-None-Match`, that is a hash per request
   * bought for nothing. Freshness is handled explicitly with `Cache-Control` on
   * the one endpoint where it helps.
   */
  app.set("etag", false);
  app.disable("x-powered-by");

  /*
   * Helmet.
   *
   * CSP is disabled here on purpose: this process serves JSON, never HTML, so a
   * content policy has no document to apply to — and shipping a restrictive
   * default CSP on an API is how a `<script>` on the Next.js origin ends up
   * blocked by a header nobody remembers setting. HSTS is left to the edge that
   * terminates TLS; this process may legitimately be reached over plain HTTP
   * from inside the network.
   */
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      hsts: false,
    }),
  );

  /*
   * CORS.
   *
   * The browser is the only caller, so the allowlist is the real access control
   * on this API. In production `CORS_ORIGINS` must name the exact origins;
   * an empty list in development reflects whatever origin asked, which is what
   * makes `localhost:3000` → `localhost:4000` work without configuration.
   *
   * No credentials: this API has no cookies and no sessions, so
   * `Access-Control-Allow-Credentials` would grant a capability nothing uses.
   */
  const allowlist = env.corsOrigins;
  app.use(
    cors({
      origin(origin, callback) {
        // No `Origin` header: curl, a health check, a server-side fetch. Not a
        // browser, so the same-origin policy is not what is protecting anything
        // here — let it through.
        if (!origin) return callback(null, true);
        if (allowlist.length === 0) return callback(null, true);
        if (allowlist.includes(origin)) return callback(null, true);
        // `false`, not an Error: an unlisted origin should get a clean response
        // without the CORS headers, not a 500 in the logs.
        return callback(null, false);
      },
      methods: ["GET", "POST", "OPTIONS"],
      maxAge: 86_400,
      credentials: false,
    }),
  );

  /*
   * Compression.
   *
   * Honest note: almost nothing here is large enough to compress. A signup
   * response is ~300 bytes, well under the 1 KB threshold, so gzip will not
   * fire on the hot path — and that is correct, because compressing 300 bytes
   * costs CPU and saves nothing. It is enabled for the stats endpoint behind a
   * CDN and for whatever this API grows into.
   */
  app.use(compression({ threshold: 1024 }));

  /*
   * Body parser with a hard ceiling.
   *
   * The largest legitimate payload here is five short fields — a few hundred
   * bytes. 8 KB is generous by an order of magnitude and still refuses to
   * allocate a megabyte because someone posted a file at the endpoint. The limit
   * is the point: without it, `express.json()` will happily buffer 100 KB per
   * request, and at 5k RPM that is memory pressure bought for nothing.
   */
  app.use(express.json({ limit: "8kb", strict: true }));

  /*
   * Optional request log.
   *
   * Off by default, because at 5,000 RPM this is 7.2 million lines a day and the
   * synchronous write to stdout becomes a real term in the latency budget. When
   * it is on, it logs after the response so the duration is real.
   */
  if (env.logRequests) {
    app.use((req, res, next) => {
      const start = process.hrtime.bigint();
      res.on("finish", () => {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        console.log(
          `[req] pid=${process.pid} ${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`,
        );
      });
      next();
    });
  }

  /*
   * `/healthz`
   *
   * Reports whether this process can actually serve a request, which means the
   * database connection — a process that is listening but cannot reach Mongo is
   * not healthy, and a load balancer that only checks the socket will keep
   * sending it traffic. 503 takes it out of rotation.
   */
  app.get("/healthz", healthLimiter, (_req, res) => {
    const connected = db.isConnected();
    res.setHeader("Cache-Control", "no-store");
    res.status(connected ? 200 : 503).json({
      status: connected ? "ok" : "degraded",
      pid: process.pid,
      uptimeSec: Math.round(process.uptime()),
      db: connected ? "connected" : "disconnected",
    });
  });

  app.use("/api/waitlist", waitlistRoutes);

  /** Unmatched path. JSON, not Express's HTML default. */
  app.use((req, res) => {
    res.status(404).json({
      error: "not_found",
      message: `No route for ${req.method} ${req.path}.`,
    });
  });

  app.use(errorHandler);

  return app;
}

/* ------------------------------------------------------------------ *
 * Error handler
 *
 * Every failure leaves here as `{ error, message }`, because that is what
 * `lib/rydin/api.ts` reads. The status code matters as much as the body: the
 * client treats 5xx as "offline" and falls back to issuing a local pass, but
 * treats 4xx as "the server said no" and shows the message. Mislabelling a
 * transient database outage as a 400 would put a red validation error on a form
 * that was filled in correctly.
 * ------------------------------------------------------------------ */
function errorHandler(err, _req, res, _next) {
  // Malformed JSON and oversized bodies both surface as `body-parser` errors.
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "bad_json", message: "Request body is not valid JSON." });
  }
  if (err && err.type === "entity.too.large") {
    return res.status(413).json({ error: "payload_too_large", message: "Request body is too large." });
  }

  // Mongoose schema validation. Reachable in principle, though `validate.js`
  // catches these first — if one arrives here it is a mismatch between the two,
  // and the reader still gets a usable message rather than a 500.
  if (err && err.name === "ValidationError") {
    const first = Object.values(err.errors || {})[0];
    return res.status(400).json({
      error: "validation_failed",
      message: first ? first.message : "Some of those details are not valid.",
    });
  }

  /*
   * Database unreachable.
   *
   * With `bufferCommands: false`, a query issued while Mongo is down rejects
   * immediately rather than queueing — which is what makes this branch fire fast
   * enough to be useful. 503 is deliberate: it tells the frontend to degrade
   * gracefully and issue a provisional pass, so a database outage costs us a
   * confirmed position, not the signup.
   */
  if (
    err &&
    (err.name === "MongoNetworkError" ||
      err.name === "MongooseServerSelectionError" ||
      err.name === "MongoNotConnectedError" ||
      err.name === "MongoTimeoutError" ||
      /buffering timed out|not connected|Client must be connected/i.test(err.message || ""))
  ) {
    console.error(`[api] database unavailable pid=${process.pid}`, err.message);
    res.setHeader("Retry-After", "5");
    return res.status(503).json({
      error: "service_unavailable",
      message: "The waitlist service is briefly unavailable. Your details were not saved.",
    });
  }

  // Anything unclassified. Logged with the stack, answered without it — a stack
  // trace in a response body is a gift to whoever is probing the endpoint.
  console.error(`[api] unhandled pid=${process.pid}`, err && err.stack ? err.stack : err);
  return res.status(500).json({
    error: "internal_error",
    message: "Something went wrong on our side. Try again in a moment.",
  });
}

module.exports = { createApp, errorHandler };
