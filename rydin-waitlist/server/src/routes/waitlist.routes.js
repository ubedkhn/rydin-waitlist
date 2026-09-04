"use strict";

const { Router } = require("express");
const controller = require("../controllers/waitlist.controller");
const asyncHandler = require("../utils/asyncHandler");
const { readLimiter, writeLimiter } = require("../middleware/rateLimit");

/* ================================================================== *
 * `/api/waitlist`
 *
 * Three endpoints, and the limiter is attached per route rather than to
 * the router as a whole. That is the point of splitting them: the write
 * gets 8 per hour, the reads get 240 per minute, and a reader polling the
 * telemetry strip can never exhaust the budget that protects the
 * database from bulk inserts.
 *
 * The limiter sits *in front of* the handler in each chain, so a
 * throttled request costs a counter lookup and nothing else — no JSON
 * parse of a large body, no connection from the pool.
 * ================================================================== */

const router = Router();

/** Join the waitlist. 201 new, 200 replay, 400 bad payload, 429 throttled. */
router.post("/", writeLimiter, asyncHandler(controller.create));

/** Live counters for the telemetry strip. Cached; safe to poll. */
router.get("/stats", readLimiter, asyncHandler(controller.readStats));

/** "Check my spot" — recover a pass by email. */
router.get("/position", readLimiter, asyncHandler(controller.readPosition));

module.exports = router;
