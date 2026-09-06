"use strict";

const { Schema, model } = require("mongoose");

/* ================================================================== *
 * Waitlist — one document per commuter.
 *
 * The schema mirrors the frontend form exactly: Username, Email, Route,
 * Gender, WomenOnlyPreference. Nothing else is collected, so nothing
 * else is stored.
 *
 * Two indexes carry the whole read path:
 *
 *  - `email` unique — the duplicate guard *and* the lookup index. Made
 *    unique at the database level rather than checked in application
 *    code: a findOne-then-insert is a race, and at 5k RPM the window is
 *    wide enough to actually lose. The unique index makes the database
 *    the arbiter, and the controller treats the resulting E11000 as a
 *    successful idempotent replay.
 *  - `referralCode` unique — read on every referred signup.
 *
 * `queuePosition` is assigned from an atomic counter (see Counter.js),
 * never from `countDocuments()`. Counting the collection per request is
 * O(n) and, worse, two simultaneous signups would compute the same
 * position.
 * ================================================================== */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const waitlistSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required."],
      trim: true,
      minlength: [3, "Username must be at least 3 characters."],
      maxlength: [24, "Username must be 24 characters or fewer."],
    },

    email: {
      type: String,
      required: [true, "Email is required."],
      trim: true,
      lowercase: true,
      maxlength: [254, "Email is too long."],
      // Declared here, and again as a schema-level index below with an explicit
      // name. Mongoose would create it from `unique: true` alone; naming it
      // makes it greppable in `db.waitlists.getIndexes()`.
      unique: true,
      validate: {
        validator: (v) => EMAIL_RE.test(v),
        message: "Enter a valid email address.",
      },
    },

    route: {
      type: String,
      required: [true, "Route is required."],
      trim: true,
      minlength: [3, "Route must be at least 3 characters."],
      maxlength: [80, "Route must be 80 characters or fewer."],
    },

    /** Denormalised corridor code (`IDR⇄BPL`, `DAVV`, or `CSTM`). */
    routeCode: {
      type: String,
      required: true,
      trim: true,
      maxlength: 12,
      index: true,
    },

    gender: {
      type: String,
      required: [true, "Gender is required."],
      enum: {
        values: ["male", "female", "other"],
        message: "Gender must be male, female, or other.",
      },
    },

    /**
     * Women-Only Matching Mode.
     *
     * The invariant — only a female commuter can hold this — is enforced three
     * times: in the form, in the controller's normalisation, and here in a
     * pre-validate hook. Belt and braces, because this flag decides who a person
     * is matched with, and a stray `true` on a non-female record would put
     * someone in a pool they were promised would not contain them.
     */
    womenOnlyPreference: {
      type: Boolean,
      default: false,
    },

    /** Derived from the email domain — see utils/validate.js. */
    institutionVerified: {
      type: Boolean,
      default: false,
    },

    /** `RY-4K7Q-2810`. Deterministic from username+email. */
    passId: {
      type: String,
      required: true,
      trim: true,
    },

    /** 6 unambiguous characters. Appended to `rydinapp.com/r/`. */
    referralCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
    },

    /** Referral code of whoever sent this person here. */
    referredBy: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },

    /** Confirmed invites credited to this record. */
    referrals: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * Absolute position, already including the base floor.
     *
     * Stored rather than computed on read: the reader's position must not move
     * because someone else joined behind them.
     */
    queuePosition: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    timestamps: true,
    // Skip the `__v` field. Nothing here does versioned array updates, and it is
    // 4 bytes plus a key on every document.
    versionKey: false,
    // Return lean-ish JSON: `_id` renamed, nothing internal leaked.
    toJSON: {
      transform(_doc, ret) {
        ret.id = String(ret._id);
        delete ret._id;
        return ret;
      },
    },
  },
);

/*
 * Indexes.
 *
 * `email` and `referralCode` are unique — the duplicate guard and the two
 * lookup paths. `createdAt` descending supports the admin "latest signups"
 * read without a collection scan.
 */
waitlistSchema.index({ email: 1 }, { unique: true, name: "uniq_email" });
waitlistSchema.index({ referralCode: 1 }, { unique: true, name: "uniq_referral_code" });
waitlistSchema.index({ createdAt: -1 }, { name: "recent_signups" });

/** The invariant, restated at the last possible moment before a write. */
waitlistSchema.pre("validate", function normaliseWomenOnly(next) {
  if (this.gender !== "female" && this.womenOnlyPreference) {
    this.womenOnlyPreference = false;
  }
  next();
});

module.exports = model("Waitlist", waitlistSchema);
