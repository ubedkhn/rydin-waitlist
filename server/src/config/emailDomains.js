"use strict";

/* ================================================================== *
 * Consumer mailbox providers.
 *
 * Mirrors `CONSUMER_EMAIL_DOMAINS` in `lib/rydin/constants.ts`.
 *
 * An institutional address is defined by *exclusion* — anything that is
 * not on this list. That covers @davv.ac.in, @nitb.ac.in, @iiti.ac.in and
 * every employer domain in India without maintaining an allowlist of
 * every college and company in the country, which is a list nobody can
 * keep current.
 *
 * The trade-off is deliberate and known: a self-hosted personal domain
 * reads as institutional. That grants a 45-spot queue jump to someone who
 * did not strictly earn it, which is a far cheaper failure than denying
 * the jump to a real student at a college we forgot to add.
 * ================================================================== */

const CONSUMER_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.in",
  "yahoo.co.in",
  "ymail.com",
  "rocketmail.com",
  "outlook.com",
  "outlook.in",
  "hotmail.com",
  "hotmail.co.uk",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "rediffmail.com",
  "protonmail.com",
  "proton.me",
  "pm.me",
  "aol.com",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "yandex.com",
  "zohomail.com",
  "tutanota.com",
  "hey.com",
]);

module.exports = { CONSUMER_EMAIL_DOMAINS };
