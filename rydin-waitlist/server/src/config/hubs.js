"use strict";

/* ================================================================== *
 * Launch geography — server copy.
 *
 * Only the two fields the server actually uses are mirrored from
 * `lib/rydin/constants.ts`: `label` (what the matcher runs against) and
 * `code` (what gets denormalised onto the document). The prose `detail`
 * and the `kind` badge are presentation and stay on the client.
 *
 * Why mirror at all rather than trust the client's `routeCode`? Because
 * the route code decides which corridor a signup counts toward, and a
 * value that arrives in a request body is a value a client can invent.
 * The server re-derives it from the free text.
 * ================================================================== */

const HUBS = [
  { id: "idr-bpl", label: "Indore ⇄ Bhopal Corridor", code: "IDR⇄BPL" },
  { id: "davv", label: "DAVV Campus", code: "DAVV" },
  { id: "sgsits", label: "SGSITS", code: "SGSITS" },
  { id: "mp-nagar", label: "MP Nagar", code: "MPN" },
  { id: "crystal-it", label: "Crystal IT Park", code: "CITP" },
  { id: "bhawarkua", label: "Bhawarkua", code: "BHK" },
];

/** Stored when the typed route is not a corridor we have opened yet. */
const CUSTOM_ROUTE_CODE = "CSTM";

module.exports = { HUBS, CUSTOM_ROUTE_CODE };
