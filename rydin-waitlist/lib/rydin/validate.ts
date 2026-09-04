import { CONSUMER_EMAIL_DOMAINS } from "./constants";
import type { WaitlistDraft } from "./types";

/** Pragmatic address check: one @, a dot in the domain, no whitespace. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/**
 * A username is a handle, not a legal name: letters, digits, and the three
 * separators people actually type. Deliberately narrower than the name field it
 * replaces — this string ends up in a URL-adjacent context and on a printed
 * ticket stub, so it should not carry emoji or punctuation.
 */
const USERNAME_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9._\- ]*[a-zA-Z0-9])?$/;

const USERNAME_MIN = 3;
const USERNAME_MAX = 24;

export type FieldName = "username" | "email" | "route" | "gender";

export type FieldErrors = Partial<Record<FieldName, string>>;

/** Trim + collapse internal runs of whitespace. Applied before every check. */
export function normalise(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function emailDomain(value: string): string {
  const trimmed = value.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  return at === -1 ? "" : trimmed.slice(at + 1);
}

/**
 * An institutional address is any valid address that is not a consumer
 * mailbox. Defining it by exclusion covers @college.edu, @nitb.ac.in and
 * @company.com without maintaining an allowlist of every employer in India.
 *
 * This is how the single email field earns the institutional queue jump — the
 * form never asks for a second, "work" address.
 */
export function isInstitutionalEmail(value: string): boolean {
  if (!isValidEmail(value)) return false;
  const domain = emailDomain(value);
  return domain.length > 0 && !CONSUMER_EMAIL_DOMAINS.has(domain);
}

/* ------------------------------------------------------------------ *
 * Per-field validation
 *
 * One function per field so the card can validate on blur without running
 * checks against inputs the reader has not touched yet. Error copy states what
 * is wrong and what to do about it. No apologies, no "Oops", no exclamation
 * marks.
 * ------------------------------------------------------------------ */

export function validateUsername(raw: string): string | undefined {
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

export function validateEmail(raw: string): string | undefined {
  const value = raw.trim();
  if (value.length === 0) return "Enter the email address you'll verify with.";
  if (!isValidEmail(value)) return "Check the address — it needs an @ and a domain.";
  return undefined;
}

export function validateRoute(raw: string): string | undefined {
  const value = normalise(raw);
  if (value.length === 0) return "Tell us the route you travel — it decides your launch batch.";
  if (value.length < 3) return "Name the two ends of your route, e.g. Vijay Nagar → Rau.";
  if (value.length > 80) return "Keep it under 80 characters.";
  return undefined;
}

export function validateGender(value: WaitlistDraft["gender"]): string | undefined {
  if (value === "") return "Select an option — this is what Women-Only matching keys off.";
  return undefined;
}

/** Validate a single field by name. Used on blur and on change-after-error. */
export function validateField(field: FieldName, draft: WaitlistDraft): string | undefined {
  switch (field) {
    case "username":
      return validateUsername(draft.username);
    case "email":
      return validateEmail(draft.email);
    case "route":
      return validateRoute(draft.route);
    case "gender":
      return validateGender(draft.gender);
  }
}

/** Every field must pass before a pass can be issued. */
export function validateAll(draft: WaitlistDraft): FieldErrors {
  const errors: FieldErrors = {};
  const username = validateUsername(draft.username);
  const email = validateEmail(draft.email);
  const route = validateRoute(draft.route);
  const gender = validateGender(draft.gender);

  if (username) errors.username = username;
  if (email) errors.email = email;
  if (route) errors.route = route;
  if (gender) errors.gender = gender;

  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
