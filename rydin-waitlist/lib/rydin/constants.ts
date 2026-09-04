import type { FaqItem, Hub, LeaderboardEntry, RewardTier, SocialLink } from "./types";

export const BRAND = {
  name: "Rydin",
  tagline: "Share the Ride. Split the Cost. Travel Smarter.",
  positioning: "India's First True Peer-to-Peer Mobility Network",
  /**
   * Used to build the share link on the Queue Pass.
   *
   * `rydinapp.com` — the .com, not a .in. Every referral link, share sheet and
   * QR on this page derives from this one constant, so there is exactly one
   * place the production domain is written down.
   */
  shareOrigin: "https://rydinapp.com",
} as const;

/* ------------------------------------------------------------------ *
 * Social & support
 *
 * One list, rendered twice: the floating social bar on desktop and the
 * footer everywhere. `handle` is what the reader sees, `href` is where it
 * goes — the support address is a real mailto:, not a contact form.
 * ------------------------------------------------------------------ */
export const SOCIAL: SocialLink[] = [
  {
    id: "instagram",
    label: "Instagram",
    handle: "@rydinapp",
    href: "https://www.instagram.com/rydinapp/",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    handle: "Rydin",
    href: "https://www.linkedin.com/company/rydin",
  },
  {
    id: "email",
    label: "Support",
    handle: "rydinhelpdesk@gmail.com",
    href: "mailto:rydinhelpdesk@gmail.com?subject=Rydin%20waitlist%20support",
  },
];

/** The support mailbox on its own, for prose links inside the FAQ. */
export const SUPPORT_EMAIL = "rydinhelpdesk@gmail.com";

/* ------------------------------------------------------------------ *
 * Launch geography
 *
 * These are *suggestions* now, not a required choice. The form asks one
 * free-text "Route traveled" question and offers this list through a
 * datalist, so someone on a corridor we haven't opened can still tell us
 * about it — without the form growing a fifth control.
 *
 * Codes are deliberately in the manner of rail/airline station codes. A
 * recognised route then prints a real code on the ticket stub, and the mono
 * face has something true to render.
 * ------------------------------------------------------------------ */
export const HUBS: Hub[] = [
  {
    id: "idr-bpl",
    label: "Indore ⇄ Bhopal Corridor",
    code: "IDR⇄BPL",
    detail: "195 km intercity. Peak departures 06:00–09:00 and 17:00–20:00.",
    kind: "corridor",
  },
  {
    id: "davv",
    label: "DAVV Campus",
    code: "DAVV",
    detail: "Takshashila & Khandwa Road campuses. Verified student matching.",
    kind: "campus",
  },
  {
    id: "sgsits",
    label: "SGSITS",
    code: "SGSITS",
    detail: "Sanwer Road feeders and Old Palasia micro-routes.",
    kind: "campus",
  },
  {
    id: "mp-nagar",
    label: "MP Nagar",
    code: "MPN",
    detail: "Bhopal coaching and commercial belt. Zone I & II pickups.",
    kind: "business",
  },
  {
    id: "crystal-it",
    label: "Crystal IT Park",
    code: "CITP",
    detail: "Corporate domain badges live. Shift-aligned pooling.",
    kind: "business",
  },
  {
    id: "bhawarkua",
    label: "Bhawarkua",
    code: "BHK",
    detail: "Highest student density in Indore. Sub-1 km match radius.",
    kind: "campus",
  },
];

/** Printed on the stub when the typed route isn't one we've opened yet. */
export const CUSTOM_ROUTE_CODE = "CSTM";

/**
 * Best-effort match of free text against a known corridor.
 *
 * Deliberately forgiving — "davv", "DAVV campus", "Indore Bhopal" all land —
 * because the reader is typing prose, not picking an ID. Returns `null` rather
 * than a fallback hub: an unrecognised route is a real answer we want to keep
 * verbatim, not something to coerce into the nearest corridor.
 */
export function findRouteMatch(route: string): Hub | null {
  const needle = route.trim().toLowerCase();
  if (needle.length < 3) return null;

  const alphaOnly = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
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
    }) ?? null
  );
}

/** Route code for a submitted route — a real corridor code, or `CSTM`. */
export function routeCodeFor(route: string): string {
  return findRouteMatch(route)?.code ?? CUSTOM_ROUTE_CODE;
}

/* ------------------------------------------------------------------ *
 * Queue economics
 * ------------------------------------------------------------------ */
export const QUEUE = {
  /**
   * The hard floor for "Commuters in queue".
   *
   * 200 is a real number: it is the seed the telemetry state initialises to and
   * the offset the backend's atomic counter is added to, so a queue position is
   * never below it and the counter never appears to run backwards. Both the
   * frontend fallback and `server/src/config/env.js` read 200 — change it in
   * both, or the server and the page will disagree.
   */
  baseCount: 200,
  /**
   * Spots gained per confirmed invite.
   *
   * Scaled to the 200 floor. The previous 250 was tuned for a queue of 12,480;
   * against a few hundred people it would move a reader from ~260 to the clamp
   * on a single invite, which makes the tier ladder meaningless. 15 keeps five
   * invites worth ~75 places — visible, and still leaves a queue in front.
   */
  spotsPerReferral: 15,
  /** Instant jump for a verified campus or corporate email domain. */
  institutionalJump: 45,
  /**
   * Pooled monthly fuel saving attributed to each commuter in the queue.
   * `commuters × this figure` is the number shown in the telemetry strip, so the
   * two metrics can never drift apart.
   */
  projectedMonthlySavingPerCommuter: 340,
  /** Corridors currently matching. Overwritten by live backend stats. */
  activeCorridors: 4,
} as const;

export const REWARD_TIERS: RewardTier[] = [
  {
    referrals: 1,
    title: "Early Beta Access",
    detail: "First build on your phone before the public store listing.",
  },
  {
    referrals: 3,
    title: "Rydin Plus",
    detail: "Zero platform fees for your first three months of riding.",
  },
  {
    referrals: 5,
    title: "Founding Member",
    detail: "₹150 fuel credit plus the Founding Member badge on your profile.",
  },
];

/** Mock ambassador board. Replace with a real query before launch. */
export const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, handle: "aarav.s", affiliation: "SGSITS", referrals: 24, spotsSkipped: 360 },
  { rank: 2, handle: "ishita_r", affiliation: "DAVV", referrals: 19, spotsSkipped: 285 },
  { rank: 3, handle: "kabir.m", affiliation: "Crystal IT Park", referrals: 16, spotsSkipped: 240 },
  { rank: 4, handle: "ananya-p", affiliation: "MANIT Bhopal", referrals: 12, spotsSkipped: 180 },
  { rank: 5, handle: "rehanq", affiliation: "IIT Indore", referrals: 9, spotsSkipped: 135 },
];

/* ------------------------------------------------------------------ *
 * Fare model
 *
 * Every figure here is an assumption, and the calculator says so on the
 * page. Keeping them in one exported object means the disclosure line and
 * the maths can never disagree.
 * ------------------------------------------------------------------ */
export const FARE_MODEL = {
  /** ₹ per litre of petrol, Madhya Pradesh pumps. */
  petrolPerLitre: 106.5,
  /** Out-and-back. */
  tripsPerDay: 2,
  /** A 5-day week bills ~22 commute days a month; a 7-day week ~30. */
  daysPerMonth: { 5: 22, 7: 30 } as Record<5 | 7, number>,
  commercial: {
    /**
     * Bike taxi, Rapido-class. `minFare` matters: on a 2 km hop the floor
     * binds and the per-km rate never applies. No surge multiplier is baked
     * in anywhere — surge is the thing commuters actually pay, so leaving it
     * out keeps this side of the comparison deliberately conservative.
     */
    "two-wheeler": { base: 22, perKm: 6.5, minFare: 35, label: "Bike taxi" },
    /** Cab, Ola/Uber mini-class. */
    "four-wheeler": { base: 45, perKm: 13.5, minFare: 70, label: "App cab" },
  },
  vehicle: {
    "two-wheeler": {
      /** km per litre. */
      mileage: 45,
      /** Flat platform micro-fee per trip. Not a percentage. Ever. */
      feePerTrip: 4,
      /**
       * A two-wheeler is always exactly rider + pillion, so occupancy is not
       * a choice the reader gets to make — the control is hidden for bikes
       * rather than shown disabled.
       */
      seatOptions: [2],
      label: "Two-wheeler",
      shortLabel: "Bike",
    },
    "four-wheeler": {
      mileage: 16,
      feePerTrip: 8,
      seatOptions: [2, 3, 4],
      label: "Four-wheeler",
      shortLabel: "Car",
    },
  },
  distance: { min: 2, max: 60, step: 1, default: 14 },
  defaultSeats: 3,
  /**
   * Below this distance the flat per-trip fee is a large share of the fuel
   * being split, so cost-sharing stops being worth the coordination. The
   * calculator says so out loud instead of quietly showing a thin number.
   */
  lowValueDistanceKm: 4,
} as const;

/* ------------------------------------------------------------------ *
 * Email classification
 *
 * An institutional address is defined by exclusion: anything that is not a
 * consumer mailbox provider. That covers @college.edu, @nitb.ac.in and
 * @company.com without maintaining an allowlist of every employer in India.
 *
 * This is the one place the single email field does double duty — it earns the
 * institutional queue jump without the form asking a second time.
 * ------------------------------------------------------------------ */
export const CONSUMER_EMAIL_DOMAINS = new Set([
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

export const FAQS: FaqItem[] = [
  {
    question: "How is Rydin different from Rapido, Uber, or Ola?",
    answer:
      "Those are commercial taxi services: a driver works for fare income, the platform takes roughly a quarter of it as commission, and demand pushes the price up through surge. Rydin is not a taxi service. Everyone on it is already making the trip — a student driving to DAVV, an engineer driving to Crystal IT Park — and the empty seats are what get shared. Your co-rider contributes toward documented fuel cost for the distance travelled, nothing more. Rydin takes a flat ₹4 (two-wheeler) or ₹8 (four-wheeler) per trip to keep verification and matching running. No commission, no surge, no incentive for anyone to drive further than they were already going.",
  },
  {
    question: "Is Rydin legally permitted in India?",
    answer:
      "Cost-sharing is legally distinct from plying a private vehicle for hire, and the difference is whether the driver earns a margin. Rydin is built so they structurally cannot: contributions are capped at the fuel cost of the distance actually shared, drivers set no price, and there is no surge or incentive layer. India's Motor Vehicle Aggregator Guidelines include a ride-pooling provision that individual states may adopt, and pooling rules genuinely differ state to state. That is why we open one corridor at a time rather than launching nationally — we go live where the permissions are settled. This is a description of how the product is designed, not legal advice; if you drive for a fleet or under a commercial permit, check your own terms.",
  },
  {
    question: "How does Women-Only matching work?",
    answer:
      "It is enforced in the matching layer, not left to preference or self-reporting. Tick “Enable Women-Only Matching Mode” on the waitlist form and, at launch, your ride pool is restricted to riders whose gender is confirmed against government ID during KYC — the same Aadhaar and live-selfie check everyone completes. A profile that has not cleared that verification is never surfaced to you and never sees you in its own results. The setting is yours to change at any time, it applies in both directions, and it is available to verified female riders and drivers alike.",
  },
  {
    question: "When does the app launch on my campus or corridor?",
    answer:
      "Matching only works above a density threshold — a carpool network with forty people spread across a city cannot fill a single seat. So we open a corridor once enough verified commuters on it have joined the queue, starting with the Indore ⇄ Bhopal corridor and the Indore campus cluster in Batch 1. The route you type on the waitlist form is what moves your area up the build order, and referrals from people on the same route count double toward opening it. You will get a notification the day your corridor turns on.",
  },
  {
    question: "What does verification actually involve?",
    answer:
      "Four checks, all mandatory, none skippable: Aadhaar identity verification, a live selfie matched against it to stop borrowed accounts, and for anyone offering seats, a driving licence plus vehicle RC confirming they own and may legally drive the car or bike they list. Campus and corporate email badges sit on top as an optional extra signal. Documents are verified and then stored encrypted — a co-rider sees your first name, photo, badges and rating, never your documents.",
  },
];
