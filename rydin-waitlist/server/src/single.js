"use strict";

const env = require("./config/env");
const db = require("./config/db");
const { createApp } = require("./app");

/* ================================================================== *
 * Single-process entry.
 *
 * Used directly by `npm run dev` (with `--watch`) and required by each
 * worker that `server.js` forks. One file, so a worker and a dev server
 * behave identically — the only difference in production is that there
 * are four of them behind the same port.
 * ================================================================== */

/**
 * Boot order, and why it is this way round.
 *
 * The database connection is *attempted* before listening but a failure does not
 * abort the boot. That is deliberate. A process that refuses to start because
 * Mongo is briefly unreachable cannot answer `/healthz`, cannot be inspected,
 * and — under a supervisor — enters a crash loop that outlives the outage that
 * caused it. Listening anyway means the load balancer gets an honest 503 from
 * `/healthz`, the driver reconnects on its own, and the process recovers without
 * anyone deploying anything.
 */
async function start() {
  try {
    await db.connect();
  } catch (err) {
    console.error(
      `[boot] mongo unreachable pid=${process.pid}: ${err.message} — listening anyway, /healthz will report degraded`,
    );
  }

  const app = createApp();

  const server = app.listen(env.port, () => {
    console.log(`[boot] listening pid=${process.pid} port=${env.port} env=${env.NODE_ENV}`);
  });

  /*
   * Keep-alive timing.
   *
   * These two numbers must sit *above* whatever idle timeout the load balancer
   * in front of this process uses (60 s on an AWS ALB, 60 s on nginx's default
   * `keepalive_timeout`). If Node closes an idle socket first, the balancer can
   * dispatch a request onto a connection that is already closing and the client
   * gets a 502 that no log here explains. `headersTimeout` must exceed
   * `keepAliveTimeout` for the same reason, one layer down.
   *
   * At 5k RPM this matters more than it looks: connection reuse is what keeps
   * the TCP and TLS handshake off the hot path entirely.
   */
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  /*
   * A request that has not sent its body in 20 seconds is either a broken client
   * or a slowloris. Either way the socket is holding a slot.
   */
  server.requestTimeout = 20_000;

  installShutdown(server);

  return server;
}

/**
 * Graceful shutdown.
 *
 * On SIGTERM — which is what a container orchestrator sends before it kills the
 * process — stop accepting new connections, let in-flight requests finish, then
 * close the database. The forced exit is the important part: `server.close()`
 * waits for keep-alive sockets to go idle, and a client holding one open would
 * otherwise stretch a deploy out to the full keep-alive timeout.
 */
function installShutdown(server) {
  let shuttingDown = false;

  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[shutdown] ${signal} pid=${process.pid}`);

    const forced = setTimeout(() => {
      console.error(`[shutdown] forced pid=${process.pid}`);
      process.exit(1);
    }, 10_000);
    // Do not let the timer itself hold the event loop open.
    forced.unref();

    server.close(async () => {
      try {
        await db.disconnect();
      } catch (err) {
        console.error(`[shutdown] db close failed pid=${process.pid}`, err.message);
      }
      clearTimeout(forced);
      console.log(`[shutdown] clean pid=${process.pid}`);
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  /*
   * Last-resort handlers.
   *
   * An unhandled rejection or an uncaught exception leaves the process in an
   * unknown state, and serving requests from a process in an unknown state is
   * worse than not serving them: it can mean a half-written document or a
   * connection that never returns to the pool. Log it and exit non-zero — the
   * cluster primary replaces the worker in milliseconds, which is a better
   * outcome than a limping process staying in rotation.
   */
  process.on("unhandledRejection", (reason) => {
    console.error(`[fatal] unhandled rejection pid=${process.pid}`, reason);
    void shutdown("unhandledRejection");
  });
  process.on("uncaughtException", (err) => {
    console.error(`[fatal] uncaught exception pid=${process.pid}`, err && err.stack ? err.stack : err);
    void shutdown("uncaughtException");
  });
}

module.exports = { start };

// Run directly: `node src/single.js` or `npm run dev`.
if (require.main === module) {
  void start();
}
