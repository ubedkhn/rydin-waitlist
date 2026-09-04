"use strict";

const { CONSUMER_EMAIL_DOMAINS } = require("../config/emailDomains");

/* ================================================================== *
 * Request validation.
 *
 * A port of `lib/rydin/validate.ts`, with two changes that matter:
 *
 *  1. It validates the *wire* shape, not a form draft — so it also
 *     coerces types. A JSON body can hand you `gender: 42` or
 *     `womenOnlyPreference: "yes"`; a form cannot.
 *  2. It is authoritative. The client's copy exists to give the reader an
 *     answer without a round-trip; this copy exists because the client is
 *     not the only thing that can POST to this endpoint.
 *
 * Error messages are the same strings the form shows, so a rejection that
 * only the server caught reads identically to one caught on blur.
 *
 * Mongoose would catch most of this at `save()` time. Doing it here first
 * is deliberate: a 400 from this function costs no database round-trip and
 * no counter increment, which is what keeps a spam flood from burning
 * queue positions and connections.
 * ================================================================== */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9._\- ]*[a-zA-Z0-9])?$/;

const USERNAME_MIN = 3;
const USERNAME_MAX = 24;
const ROUTE_MIN = 3;
const ROUTE_MAX = 80;
const EMAIL_MAX = 254; // RFC 5321 path limit. Anything longer is not an address.

const GENDERS = new Set(["male", "female", "other"]);

/** A referral code is exactly six characters of the Crockford-ish alphabet. */
const REFERRAL_PATTERN = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{6}$/;

/** Trim and collapse internal whitespace runs. Applied before every check. */
function normalise(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value || "").trim());
}

function emailDomain(value) {
  const trimmed = String(value || "").trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  return at === -1 ? "" : trimmed.slice(at + 1);
}

/**
 * Institutional = a valid address that is not a consumer mailbox.
 *
 * This is how one email field earns the institutional queue jump without the
 * form asking for a second, "work" address.
 */
function isInstitutionalEmail(value) {
  if (!isValidEmail(value)) return false;
  const domain = emailDomain(value);
  return domain.length > 0 && !CONSUMER_EMAIL_DOMAINS.has(domain);
}

function validateUsername(raw) {
  const value = normalise(raw);
  if (value.length === 0) return "Pick a username — this is what co-riders will see.";
  if (value.length < USERNAME_MIN) return `At least ${USERNAME_MIN} characters.`;
  if (value.length > USERNAME_MAX) return `Keep it under ${USERNAME_MAX} characters.`;
  if (!/[a-zA-Z]/.test(value)) return "Usernames need at least one letter.";
  if (!USERNAME_PATTERN.test(value)) {
    return "Letters, numbers, dots, hyphens and underscores only.";
  }
  return undefined;
}

function validateEmail(raw) {
  const value = String(raw || "").trim();
  if (value.length === 0) return "Enter the email address you'll verify with.";
  if (value.length > EMAIL_MAX) return "That address is too long.";
  if (!isValidEmail(value)) return "Check the address — it needs an @ and a domain.";
  return undefined;
}

function validateRoute(raw) {
  const value = normalise(raw);
  if (value.length === 0) return "Tell us the route you travel — it decides your launch batch.";
  if (value.length < ROUTE_MIN) return "Name the two ends of your route, e.g. Vijay Nagar → Rau.";
  if (value.length > ROUTE_MAX) return `Keep it under ${ROUTE_MAX} characters.`;
  return undefined;
}

function validateGender(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (value.length === 0) return "Select an option — this is what Women-Only matching keys off.";
  if (!GENDERS.has(value)) return "Gender must be male, female, or other.";
  return undefined;
}

/**
 * Validate and normalise a signup body in one pass.
 *
 * Returns `{ errors, value }`. `errors` is an object keyed by field name, empty
 * when the body is good; `value` is the cleaned, typed, canonical record and is
 * only meaningful when `errors` is empty.
 *
 * Note what `value` does *not* contain: `routeCode` and `institutionVerified`
 * are derived downstream from `route` and `email`, and `queuePosition` comes
 * from the counter. Nothing a caller sends can set them.
 */
function validateSignup(body) {
  const source = body && typeof body === "object" ? body : {};

  const errors = {};
  const username = validateUsername(source.username);
  const email = validateEmail(source.email);
  const route = validateRoute(source.route);
  const gender = validateGender(source.gender);

  if (username) errors.username = username;
  if (email) errors.email = email;
  if (route) errors.route = route;
  if (gender) errors.gender = gender;

  if (Object.keys(errors).length > 0) {
    return { errors, value: null };
  }

  const canonicalGender = String(source.gender).trim().toLowerCase();

  /*
   * Women-Only Matching Mode, re-derived rather than trusted.
   *
   * The flag decides who a person is matched with. A `true` on a record whose
   * gender is not female would place someone in a pool they were explicitly
   * promised would not contain them, so the `&&` is not defensive habit — it is
   * the guarantee, restated where a request body cannot reach around it.
   */
  const womenOnlyPreference =
    canonicalGender === "female" && truthy(source.womenOnlyPreference);

  /*
   * An unusable referral code is dropped, not rejected. Someone arriving from a
   * mistyped or expired link still wants to join; failing their signup to
   * protect the referrer's credit would be the wrong trade.
   */
  const referredByRaw = String(source.referredBy || "").trim().toUpperCase();
  const referredBy = REFERRAL_PATTERN.test(referredByRaw) ? referredByRaw : null;

  return {
    errors,
    value: {
      username: normalise(source.username),
      email: String(source.email).trim().toLowerCase(),
      route: normalise(source.route),
      gender: canonicalGender,
      womenOnlyPreference,
      referredBy,
    },
  };
}

/** JSON booleans arrive as booleans; HTML forms and curl send strings. */
function truthy(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  return /^(1|true|yes|on)$/i.test(String(value || ""));
}

module.exports = {
  normalise,
  truthy,
  isValidEmail,
  emailDomain,
  isInstitutionalEmail,
  validateUsername,
  validateEmail,
  validateRoute,
  validateGender,
  validateSignup,
  REFERRAL_PATTERN,
};
