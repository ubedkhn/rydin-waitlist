"use strict";

/* ================================================================== *
 * asyncHandler
 *
 * Express 4 does not catch rejected promises from a route handler. An
 * `await` that throws inside a bare `async (req, res)` produces an
 * unhandled rejection, the request hangs until the client's timeout, and
 * the error handler never runs — so the reader sees a spinner instead of
 * a 503 and nothing reaches the logs.
 *
 * Wrapping every async route in this is the fix. Express 5 does it
 * natively; until then, this is three lines that prevent a whole class of
 * silent hang.
 * ================================================================== */

module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
