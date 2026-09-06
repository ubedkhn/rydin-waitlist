"use strict";

/* ================================================================== *
 * Identity — pass IDs and referral codes.
 *
 * This file is a line-for-line port of the client's `lib/rydin/calc.ts`,
 * and that is the whole point of it. Both sides derive the pass ID and
 * the referral code from the same two fields with the same hash, so:
 *
 *  - A commuter who joined while the API was unreachable holds a locally
 *    issued pass. When the API comes back and they submit again, the
 *    server derives the *same* `RY-…` serial and the *same* referral
 *    code. The pass in their screenshot is still their pass; only the
 *    queue position is upgraded from provisional to authoritative.
 *  - A referral link shared from an offline pass still resolves, because
 *    the code the client printed is the code the server will store.
 *
 * If you change the hash, the alphabet, or either format here, change
 * `lib/rydin/calc.ts` in the same commit. A mismatch is not a crash — it
 * is two different passes for one person, discovered by a user.
 * ================================================================== */

/**
 * FNV-1a, 32-bit.
 *
 * Not a cryptographic hash and not used as one: nothing here is a secret, the
 * codes are public identifiers printed on a shareable ticket. What is needed is
 * determinism, speed, and decent avalanche over short ASCII strings — which is
 * exactly what FNV-1a is for. `Math.imul` does the 32-bit multiply without
 * losing precision to float64, and `>>> 0` keeps the result unsigned.
 */
function fnv1a(input) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Crockford-ish base32: no I, L, O or U.
 *
 * I/1 and O/0 are indistinguishable in most faces, and dropping U means the
 * generator cannot spell an unfortunate word into someone's referral code.
 */
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function encodeBase32(value, length) {
  let n = value;
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out = CODE_ALPHABET[n % CODE_ALPHABET.length] + out;
    n = Math.floor(n / CODE_ALPHABET.length);
  }
  return out;
}

/**
 * The seed both codes derive from.
 *
 * Trimmed and lowercased so that `  Priya @Nitb.ac.in` and `priya@nitb.ac.in`
 * are the same person — which matters, because the email column is stored
 * lowercased and unique. Anything that collapses to one row must collapse to
 * one seed.
 */
function makeIdentitySeed(username, email) {
  return fnv1a(`${String(username).trim().toLowerCase()}|${String(email).trim().toLowerCase()}`);
}

/** `RY-4K7Q-2810` — printed on the ticket stub. */
function makePassId(seed) {
  return `RY-${encodeBase32(seed, 4)}-${String(seed % 10_000).padStart(4, "0")}`;
}

/**
 * 6 unambiguous characters.
 *
 * The seed is multiplied by the golden-ratio constant first so that the pass ID
 * and the referral code do not share visible prefix structure — otherwise the
 * first four characters of both would be the same base32 digits and the pair
 * would look like a typo of each other.
 */
function makeReferralCode(seed) {
  return encodeBase32(Math.imul(seed, 0x9e3779b1) >>> 0, 6);
}

/**
 * The share origin. `rydinapp.com` — the .com, never a .in.
 *
 * Deliberately a constant and not an environment variable. Making it
 * configurable would mean a mistyped staging value could ship a referral link
 * pointing at a domain we do not own, and referral links are the one artefact
 * here that outlives the deploy that produced it. Mirrors `BRAND.shareOrigin`
 * in `lib/rydin/constants.ts`.
 */
const SHARE_ORIGIN = "https://rydinapp.com";

function buildReferralLink(referralCode) {
  return `${SHARE_ORIGIN}/r/${referralCode}`;
}

/** Everything derived from one (username, email) pair, in one call. */
function deriveIdentity(username, email) {
  const seed = makeIdentitySeed(username, email);
  const referralCode = makeReferralCode(seed);
  return {
    seed,
    passId: makePassId(seed),
    referralCode,
    referralLink: buildReferralLink(referralCode),
  };
}

module.exports = {
  fnv1a,
  encodeBase32,
  makeIdentitySeed,
  makePassId,
  makeReferralCode,
  buildReferralLink,
  deriveIdentity,
  CODE_ALPHABET,
  SHARE_ORIGIN,
};
