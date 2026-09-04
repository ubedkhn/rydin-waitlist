"use strict";

const { Schema, model } = require("mongoose");
const env = require("../config/env");

/* ================================================================== *
 * Counter — the atomic queue-position allocator.
 *
 * One document, `{ _id: "waitlist", seq: <n> }`, incremented with
 * `findOneAndUpdate($inc)`. That single operation is atomic at the
 * document level in MongoDB, so two signups landing in the same
 * millisecond on two different workers get 41 and 42 — never 41 twice.
 *
 * The alternative — `countDocuments() + 1` — is wrong twice over:
 *
 *  1. Correctness. Two concurrent requests both count 40 and both claim
 *     position 41. At 83 req/s that is not a theoretical race, it is a
 *     daily occurrence.
 *  2. Cost. `countDocuments()` is a scan (it runs an aggregation with a
 *     `$group`), so the price of a signup grows with the size of the
 *     waitlist. This counter is a single-document write against `_id`,
 *     which is O(1) forever.
 *
 * The counter is monotonic and never reused. If a signup fails validation
 * *after* a number was drawn, that number is simply skipped — a gap in
 * the sequence is invisible to everyone, whereas a duplicate position is
 * a support ticket.
 * ================================================================== */

const counterSchema = new Schema(
  {
    /** Named, not auto-generated: `"waitlist"` is the only sequence today. */
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { versionKey: false },
);

const Counter = model("Counter", counterSchema);

const WAITLIST_SEQUENCE = "waitlist";

/**
 * Draw the next absolute queue position.
 *
 * `upsert: true` means the counter document does not need to be seeded — the
 * first signup creates it at 1. `new: true` returns the post-increment value,
 * which is the whole point: the pre-increment value is what somebody else got.
 *
 * The base floor is added here rather than stored in the counter so that
 * changing `QUEUE_BASE_COUNT` shifts everyone consistently instead of creating
 * a discontinuity between records written before and after the change.
 *
 * @returns {Promise<number>} e.g. 201 for the first commuter when base is 200.
 */
async function nextQueuePosition() {
  const doc = await Counter.findByIdAndUpdate(
    WAITLIST_SEQUENCE,
    { $inc: { seq: 1 } },
    {
      new: true,
      upsert: true,
      // Only `seq` is ever read back. Skipping the rest of the document keeps
      // the response to a few dozen bytes.
      projection: { seq: 1 },
      // The write is already acknowledged by the primary via the connection's
      // default write concern; nothing further is needed for a counter.
      lean: true,
    },
  );

  return env.queueBaseCount + doc.seq;
}

/**
 * Current value without incrementing. Used by `/api/waitlist/stats` as a
 * cheaper, and more truthful, "total in queue" than a document count: it
 * includes the base floor and it cannot regress if a record is ever removed.
 */
async function peekQueueLength() {
  const doc = await Counter.findById(WAITLIST_SEQUENCE, { seq: 1 }).lean();
  return env.queueBaseCount + (doc ? doc.seq : 0);
}

module.exports = { Counter, nextQueuePosition, peekQueueLength, WAITLIST_SEQUENCE };
