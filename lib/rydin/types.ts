/** Gender, as collected by the waitlist form. Drives Women-Only eligibility. */
export type Gender = "male" | "female" | "other";

/** Vehicle class used by the savings calculator. */
export type VehicleType = "two-wheeler" | "four-wheeler";

/** Commute days per week. */
export type Frequency = 5 | 7;

/**
 * A launch corridor or campus/office hub.
 *
 * These are now *suggestions* rather than a required choice: the form asks for
 * one free-text "Route traveled" field and offers these through a datalist, so
 * the reader can name a corridor we haven't opened yet without the form growing
 * a fifth control.
 */
export interface Hub {
  /** Stable key. */
  id: string;
  /** Human label shown in the suggestion list. */
  label: string;
  /**
   * Short code in the manner of a rail/airline station code. Rendered in mono
   * so route chips read as transit infrastructure, not as generic tags.
   */
  code: string;
  /** One-line context shown under the field once the route is recognised. */
  detail: string;
  kind: "corridor" | "campus" | "business";
}

/** A referral reward step. */
export interface RewardTier {
  referrals: number;
  referralLabel?: string;
  title: string;
  detail: string;
}

export interface LeaderboardEntry {
  rank: number;
  handle: string;
  affiliation: string;
  referrals: number;
  spotsSkipped: number;
}

export interface FaqItem {
  question: string;
  answer: string;
}

/** An external link rendered in the footer / social bar. */
export interface SocialLink {
  id: "instagram" | "linkedin" | "email";
  label: string;
  /** What the reader sees, e.g. `@rydinapp`. */
  handle: string;
  href: string;
}

/* ------------------------------------------------------------------ *
 * The form
 *
 * Exactly four collected fields — username, email, route, gender — plus one
 * conditional preference that only exists for `gender === "female"`.
 * ------------------------------------------------------------------ */

export interface WaitlistDraft {
  /** Display handle. Not an email, not a legal name. */
  username: string;
  email: string;
  /** Free text: "Vijay Nagar → Rau", or a suggested corridor label. */
  route: string;
  /** Empty string until chosen, so the select can hold a real placeholder. */
  gender: Gender | "";
  /**
   * Women-Only Matching Mode. Only ever true when `gender === "female"`; the
   * provider and the backend both re-assert that rather than trusting the UI.
   */
  womenOnlyPreference: boolean;
}

/** The issued pass. Persisted to localStorage so a refresh remembers. */
export interface QueuePassRecord {
  /** Bumped to 2 when the form moved to username/email/route/gender. */
  version: 2;
  username: string;
  email: string;
  route: string;
  /** Resolved corridor code when the route matched a known hub, else `CSTM`. */
  routeCode: string;
  gender: Gender;
  womenOnlyPreference: boolean;
  /** True when the email matched a recognised campus/corporate domain. */
  institutionVerified: boolean;
  /** Pass serial, e.g. `RY-4K7Q-2810`. */
  passId: string;
  /** Referral code appended to the share link. */
  referralCode: string;
  /** Position at the moment of joining, before any referral credit. */
  basePosition: number;
  /** Confirmed invites. Drives the tier tracker and the queue jump. */
  referrals: number;
  /** ISO timestamp of joining. */
  joinedAt: string;
  /**
   * Where the position came from. `"server"` means the Express/Mongo backend
   * issued it from its atomic counter; `"local"` means the backend was
   * unreachable and the page fell back to a deterministic local position. The
   * pass says which, because a number that might be fictional should admit it.
   */
  origin: "server" | "local";
}

/* ------------------------------------------------------------------ *
 * Live telemetry
 *
 * One object, one source of truth for the counter strip. Seeded from the
 * hardcoded floor, incremented locally on every successful submission, and
 * overwritten wholesale whenever the backend hands us real figures.
 * ------------------------------------------------------------------ */
export interface TelemetrySnapshot {
  /** Commuters in queue. Never below `QUEUE.baseCount`. */
  commuters: number;
  /** ₹ per month, pooled across the queue. */
  monthlyFuelSavings: number;
  /** Distinct routes with enough density to matter. */
  activeCorridors: number;
}

/** Result of the commute savings model. All money is ₹ per month unless noted. */
export interface SavingsResult {
  /** Billable commute days in a month. */
  daysPerMonth: number;
  /** One-way trips per day (always 2 — out and back). */
  tripsPerDay: number;
  /** People splitting the fuel bill, driver included. */
  seats: number;

  /** Carrying the whole fuel bill yourself. The car-owner's real baseline. */
  soloMonthly: number;
  /** Commercial cab / bike taxi at published rates, no surge applied. */
  commercialMonthly: number;
  /** Your fuel share through Rydin, including flat platform micro-fees. */
  rydinMonthly: number;

  /** vs a commercial cab. */
  savedVsCommercialMonthly: number;
  savedVsCommercialYearly: number;
  savedVsCommercialPercent: number;

  /** vs driving solo — where the conservative "~50% cheaper" claim comes from. */
  savedVsSoloMonthly: number;
  savedVsSoloPercent: number;

  /** Effective per-km cost through Rydin, for the assumptions line. */
  rydinPerKm: number;
  /**
   * True when the flat per-trip fee costs more than the fuel it saves, so
   * sharing is genuinely *worse* than driving yourself. Only reachable on very
   * short two-wheeler trips, and the UI says so out loud rather than showing a
   * zeroed saving.
   */
  costsMoreThanSolo: boolean;
  /**
   * Distance at which sharing starts beating driving yourself, for this vehicle
   * and occupancy. Derived, not configured — it moves with mileage, fee and
   * seat count, so quoting a hard-coded number would eventually be a lie.
   */
  soloBreakEvenKm: number;
  /**
   * True when the saving against driving yourself is thin enough that pooling
   * isn't worth the coordination. Defined by the economics rather than a fixed
   * distance, because the crossover differs per vehicle.
   */
  isLowValue: boolean;
}
