"use strict";

const Waitlist = require("../models/Waitlist");
const { nextQueuePosition, peekQueueLength } = require("../models/Counter");
const { deriveIdentity, buildReferralLink } = require("../utils/identity");
const { routeCodeFor } = require("../utils/routeCode");
const { validateSignup, validateEmail, isInstitutionalEmail } = require("../utils/validate");
const stats = require("../services/stats.service");

/* ================================================================== *
 * Waitlist controller.
 *
 * Three handlers, and every response is wrapped in `{ data: … }` because
 * that is the envelope `lib/rydin/api.ts` unwraps. Errors answer
 * `{ error, message }`, because the same client reads `message` from any
 * non-2xx body.
 *
 * The write path is the interesting one. In order:
 *
 *   1. Validate — before any database work, so a spam flood costs one
 *      regex pass and no connection.
 *   2. Look up the email — one indexed read. Its job is to keep a
 *      refresh from drawing a fresh queue number (see below).
 *   3. Draw a position from the atomic counter.
 *   4. Insert, catching E11000 as a replay rather than an error.
 *   5. Respond, then credit the referrer off the response path.
 * ================================================================== */

/** The `data` block. One shape for create, replay and lookup. */
function toResponse(doc, { totalInQueue, alreadyJoined }) {
  return {
    passId: doc.passId,
    referralCode: doc.referralCode,
    referralLink: buildReferralLink(doc.referralCode),
    queuePosition: doc.queuePosition,
    totalInQueue,
    institutionVerified: Boolean(doc.institutionVerified),
    womenOnlyPreference: Boolean(doc.womenOnlyPreference),
    routeCode: doc.routeCode,
    joinedAt: new Date(doc.createdAt || Date.now()).toISOString(),
    alreadyJoined,
  };
}

/**
 * `POST /api/waitlist`
 *
 * 201 on a new signup, 200 on a replay of one that already exists, 400 on a bad
 * payload. Never 500 for anything the caller could have got right.
 */
async function create(req, res) {
  const { errors, value } = validateSignup(req.body);

  if (Object.keys(errors).length > 0) {
    /*
     * `message` is the first field error, not a generic "validation failed".
     * The client surfaces `message` verbatim, so this is the string a reader
     * actually reads — it should tell them which field and what to do. `fields`
     * carries the full map for a caller that wants to mark up a form.
     */
    return res.status(400).json({
      error: "validation_failed",
      message: Object.values(errors)[0],
      fields: errors,
    });
  }

  /*
   * The idempotency read.
   *
   * Its real purpose is not to avoid the E11000 — the unique index handles that
   * correctly on its own. It is to avoid *drawing a counter number* for someone
   * who is already in the queue. The counter is what `stats` reports as the
   * commuter count, so burning a number on every refresh of a submitted form
   * would inflate the public headline figure with people who do not exist.
   *
   * One indexed lookup on a unique index is roughly a millisecond, which is a
   * cheap price for a number that appears on the landing page.
   */
  const existing = await Waitlist.findOne({ email: value.email }).lean();
  if (existing) {
    return res.status(200).json({
      data: toResponse(existing, {
        totalInQueue: await peekQueueLength(),
        alreadyJoined: true,
      }),
    });
  }

  const identity = deriveIdentity(value.username, value.email);

  /*
   * Everything derived server-side. Note what is *not* taken from the body:
   * `routeCode`, `institutionVerified`, `passId`, `referralCode` and
   * `queuePosition`. A caller can influence them only through the two fields
   * they are derived from.
   */
  const queuePosition = await nextQueuePosition();

  try {
    const created = await Waitlist.create({
      username: value.username,
      email: value.email,
      route: value.route,
      routeCode: routeCodeFor(value.route),
      gender: value.gender,
      womenOnlyPreference: value.womenOnlyPreference,
      institutionVerified: isInstitutionalEmail(value.email),
      passId: identity.passId,
      referralCode: identity.referralCode,
      referredBy: value.referredBy,
      referrals: 0,
      queuePosition,
    });

    // This worker's cached stats are now stale by exactly one commuter.
    stats.invalidate();

    res.status(201).json({
      data: toResponse(created, { totalInQueue: queuePosition, alreadyJoined: false }),
    });

    /*
     * Referral credit, off the response path.
     *
     * The reader is not waiting on their referrer's counter, so this must not
     * sit inside their latency budget. Failures are logged and dropped: a lost
     * increment costs the referrer 15 notional spots, while failing the signup
     * over it would cost us the commuter.
     */
    creditReferrer(value.referredBy, identity.referralCode);
    return undefined;
  } catch (err) {
    /*
     * E11000 — two requests for the same new email raced, and this one lost.
     *
     * That is not an error from the caller's point of view: the outcome they
     * asked for happened. Read the winner's record and return it as a replay.
     * The number this request drew from the counter is simply skipped, which is
     * invisible to everyone — a gap in the sequence has no meaning, whereas two
     * people holding position 214 is a support ticket.
     */
    if (err && err.code === 11000) {
      const winner = await Waitlist.findOne({ email: value.email }).lean();
      if (winner) {
        return res.status(200).json({
          data: toResponse(winner, {
            totalInQueue: await peekQueueLength(),
            alreadyJoined: true,
          }),
        });
      }
    }
    throw err;
  }
}

/**
 * Credit the referrer, if the code resolves to somebody else.
 *
 * `referralCode` is unique and indexed, so this is a single-document update
 * against an index. The self-referral guard matters: the codes are deterministic
 * from username+email, so anyone can compute their own and paste it into their
 * own signup.
 */
function creditReferrer(referredBy, ownCode) {
  if (!referredBy || referredBy === ownCode) return;

  Waitlist.updateOne({ referralCode: referredBy }, { $inc: { referrals: 1 } })
    .exec()
    .catch((err) => {
      console.error(`[waitlist] referral credit failed code=${referredBy}`, err.message);
    });
}

/**
 * `GET /api/waitlist/stats`
 *
 * Served from the service's TTL cache. `Cache-Control` lets a CDN or the
 * browser absorb the rest, which is the difference between one Mongo read per
 * window and one per reader.
 */
async function readStats(_req, res) {
  const data = await stats.getStats();
  res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=45");
  res.status(200).json({ data });
}

/**
 * `GET /api/waitlist/position?email=…`
 *
 * The "Check my spot" lookup. Returns the same block as a signup so the client
 * can rebuild a pass from it on a new device.
 *
 * Deliberately `no-store`: this is one person's record, and a shared cache
 * holding it keyed only by URL would be a way to read a stranger's position.
 */
async function readPosition(req, res) {
  const email = String(req.query.email || "").trim().toLowerCase();

  const invalid = validateEmail(email);
  if (invalid) {
    return res.status(400).json({ error: "validation_failed", message: invalid });
  }

  const doc = await Waitlist.findOne({ email }).lean();
  if (!doc) {
    /*
     * A plain 404 with a neutral message. It does confirm whether an address is
     * on the list — unavoidable for a feature whose entire purpose is to answer
     * that question — so the response deliberately carries nothing beyond that
     * fact: no name, no route, no timing difference worth measuring.
     */
    res.setHeader("Cache-Control", "no-store");
    return res.status(404).json({
      error: "not_found",
      message: "That address isn't on the waitlist yet.",
    });
  }

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    data: toResponse(doc, { totalInQueue: await peekQueueLength(), alreadyJoined: true }),
  });
  return undefined;
}

module.exports = { create, readStats, readPosition };
