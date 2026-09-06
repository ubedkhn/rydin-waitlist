"use strict";

const { HUBS, CUSTOM_ROUTE_CODE } = require("../config/hubs");

/* ================================================================== *
 * Route → corridor code.
 *
 * A port of `findRouteMatch` / `routeCodeFor` from
 * `lib/rydin/constants.ts`. The client shows the reader a code on their
 * pass; the server stores the code it derives itself. They agree because
 * this is the same algorithm — but the server's answer is the one that
 * ends up in the database, so a forged `routeCode` in the request body
 * cannot move a signup into a corridor it does not belong to.
 * ================================================================== */

/** Strip everything but letters so punctuation and arrows stop mattering. */
function alphaOnly(value) {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * Best-effort match of free text against a known corridor.
 *
 * Forgiving in both directions: the needle may contain the hub label
 * ("I commute on the DAVV Campus route") or the label may contain the needle
 * ("davv"). Codes are matched too, but only at three characters or more —
 * a two-letter code would fire on almost any sentence.
 *
 * Returns `null` rather than a nearest-neighbour guess. An unrecognised route is
 * real information about where to build next, and coercing it into the closest
 * open corridor would destroy exactly that.
 */
function findRouteMatch(route) {
  const needle = String(route || "").trim().toLowerCase();
  if (needle.length < 3) return null;

  const needleAlpha = alphaOnly(needle);

  return (
    HUBS.find((h) => {
      const label = alphaOnly(h.label);
      const code = alphaOnly(h.code);
      return (
        needleAlpha.includes(label) ||
        label.includes(needleAlpha) ||
        (code.length >= 3 && needleAlpha.includes(code))
      );
    }) || null
  );
}

/** A real corridor code, or `CSTM`. Never empty — the column is required. */
function routeCodeFor(route) {
  const match = findRouteMatch(route);
  return match ? match.code : CUSTOM_ROUTE_CODE;
}

module.exports = { findRouteMatch, routeCodeFor, CUSTOM_ROUTE_CODE };
