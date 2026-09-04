import { FARE_MODEL, QUEUE, REWARD_TIERS, BRAND } from "./constants";
import type {
  Frequency,
  QueuePassRecord,
  RewardTier,
  SavingsResult,
  VehicleType,
} from "./types";

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */

const inrWhole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const countFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

/** `42432` → `₹42,432`. Indian digit grouping, no paise. */
export function formatINR(value: number): string {
  return inrWhole.format(Math.round(value));
}

/** `12480` → `12,480`. Lakh/crore grouping. */
export function formatCount(value: number): string {
  return countFormatter.format(Math.round(value));
}

/**
 * Large money, written the way an Indian reader scans it.
 * `4243200` → `₹42.43 L`, `10824000` → `₹1.08 Cr`.
 */
export function formatINRCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
  if (abs >= 1_00_000) return `₹${(value / 1_00_000).toFixed(2)} L`;
  if (abs >= 1_000) return `₹${(value / 1_000).toFixed(1)}K`;
  return formatINR(value);
}

/* ------------------------------------------------------------------ *
 * Deterministic identifiers
 *
 * FNV-1a over username+email. Deterministic on purpose: the same person always
 * gets the same pass serial and the same referral code, so a refresh — or a
 * "Check my spot" lookup — never quietly reissues a different pass. The backend
 * derives its codes from the same two fields with the same algorithm, so a
 * server-issued pass and a locally-issued one agree on identity even though
 * only the server can hand out a real position.
 * ------------------------------------------------------------------ */

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // 16777619, via shifts, kept inside 32 bits.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Crockford-ish alphabet: no I, L, O, U — unambiguous when read off a screen. */
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function encodeBase32(value: number, length: number): string {
  let n = value;
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out = CODE_ALPHABET[n % CODE_ALPHABET.length] + out;
    n = Math.floor(n / CODE_ALPHABET.length);
  }
  return out;
}

export function makeIdentitySeed(username: string, email: string): number {
  return fnv1a(
    `${username.trim().toLowerCase()}|${email.trim().toLowerCase()}`,
  );
}

/** `RY-4K7Q-2810` — printed on the ticket stub. */
export function makePassId(seed: number): string {
  return `RY-${encodeBase32(seed, 4)}-${String(seed % 10_000).padStart(4, "0")}`;
}

/** 6 unambiguous characters, appended to the share link. */
export function makeReferralCode(seed: number): string {
  return encodeBase32(Math.imul(seed, 0x9e3779b1) >>> 0, 6);
}

/** Always `https://rydinapp.com/r/<code>` — never a .in. */
export function buildReferralLink(referralCode: string): string {
  return `${BRAND.shareOrigin}/r/${referralCode}`;
}

/* ------------------------------------------------------------------ *
 * Queue position
 * ------------------------------------------------------------------ */

/**
 * Nobody is ever shown a position below this.
 *
 * Scaled to the 200-commuter floor: the jumps below have to be able to move a
 * reader meaningfully up a queue of a few hundred without the arithmetic
 * bottoming out at the clamp on the first referral.
 */
export const MIN_QUEUE_POSITION = 12;

/**
 * Position at the moment of joining, before any credit is applied.
 *
 * Used only as the offline fallback. When the backend is reachable it returns
 * the authoritative position from its atomic counter, and that wins.
 */
export function makeBasePosition(seed: number): number {
  // Lands just behind the people already in line: baseCount + 11..214.
  return QUEUE.baseCount + 11 + (seed % 204);
}

export interface QueueStanding {
  basePosition: number;
  /** Spots gained from a verified institutional domain. */
  institutionalJump: number;
  /** Spots gained from confirmed invites. */
  referralJump: number;
  /** Total spots gained. */
  totalJump: number;
  /** What the reader sees as their position now. */
  currentPosition: number;
}

export function computeStanding(record: {
  basePosition: number;
  referrals: number;
  institutionVerified: boolean;
}): QueueStanding {
  const institutionalJump = record.institutionVerified ? QUEUE.institutionalJump : 0;
  const referralJump = Math.max(0, record.referrals) * QUEUE.spotsPerReferral;
  const totalJump = institutionalJump + referralJump;
  return {
    basePosition: record.basePosition,
    institutionalJump,
    referralJump,
    totalJump,
    currentPosition: Math.max(MIN_QUEUE_POSITION, record.basePosition - totalJump),
  };
}

/* ------------------------------------------------------------------ *
 * Reward tiers
 * ------------------------------------------------------------------ */

export interface TierProgress {
  unlocked: RewardTier[];
  /** Undefined once every tier is unlocked. */
  next?: RewardTier;
  /** Invites still needed for `next`. */
  remaining: number;
  /** 0–100 across the whole tier ladder, for the progress rail. */
  percent: number;
}

export function computeTierProgress(referrals: number): TierProgress {
  const maxTier = REWARD_TIERS[REWARD_TIERS.length - 1].referrals;
  const unlocked = REWARD_TIERS.filter((t) => referrals >= t.referrals);
  const next = REWARD_TIERS.find((t) => referrals < t.referrals);
  return {
    unlocked,
    next,
    remaining: next ? next.referrals - referrals : 0,
    percent: Math.min(100, (referrals / maxTier) * 100),
  };
}

/* ------------------------------------------------------------------ *
 * Commute savings model
 *
 * Two baselines, because they answer different questions:
 *
 *  - vs a commercial cab: the gap is enormous (~80%), but most of it is the
 *    driver's labour, the vehicle's depreciation and the platform's ~25% cut.
 *    Real, yet it flatters us, so it is reported and not celebrated.
 *  - vs driving solo: the honest car-owner comparison, and the only one whose
 *    ratio actually depends on how many seats get filled. This is where the
 *    conservative "~50% cheaper" claim comes from and it is the headline.
 *
 * The commercial side applies published base + per-km with a minimum-fare
 * floor, and deliberately no surge multiplier — surge is what commuters
 * actually pay, so omitting it keeps the comparison honest rather than loud.
 * ------------------------------------------------------------------ */

export function availableSeats(vehicle: VehicleType): readonly number[] {
  return FARE_MODEL.vehicle[vehicle].seatOptions;
}

/** Clamps a seat count to what the vehicle can physically seat. */
export function normaliseSeats(vehicle: VehicleType, seats: number): number {
  const options = availableSeats(vehicle);
  return options.includes(seats) ? seats : options[options.length - 1];
}

export function computeSavings(
  distanceKm: number,
  frequency: Frequency,
  vehicle: VehicleType,
  seatsInput: number = FARE_MODEL.defaultSeats,
): SavingsResult {
  const distance = Math.max(
    FARE_MODEL.distance.min,
    Math.min(FARE_MODEL.distance.max, distanceKm),
  );
  const seats = normaliseSeats(vehicle, seatsInput);
  const daysPerMonth = FARE_MODEL.daysPerMonth[frequency];
  const tripsPerMonth = daysPerMonth * FARE_MODEL.tripsPerDay;

  const spec = FARE_MODEL.vehicle[vehicle];
  const fuelPerKm = FARE_MODEL.petrolPerLitre / spec.mileage;

  // Baseline A — driving solo: the entire fuel bill, no fee, no split.
  const soloMonthly = fuelPerKm * distance * tripsPerMonth;

  // Baseline B — commercial fare, with the minimum-fare floor honoured.
  const commercial = FARE_MODEL.commercial[vehicle];
  const commercialPerTrip = Math.max(
    commercial.minFare,
    commercial.base + commercial.perKm * distance,
  );
  const commercialMonthly = commercialPerTrip * tripsPerMonth;

  // Rydin — your share of the fuel, plus the flat micro-fee.
  const rydinPerKm = fuelPerKm / seats;
  const rydinMonthly = (rydinPerKm * distance + spec.feePerTrip) * tripsPerMonth;

  const savedVsSolo = Math.max(0, soloMonthly - rydinMonthly);
  const savedVsCommercial = Math.max(0, commercialMonthly - rydinMonthly);
  const savedVsSoloPercent =
    soloMonthly > 0 ? (savedVsSolo / soloMonthly) * 100 : 0;

  /*
   * Where sharing overtakes driving yourself. Splitting fuel saves
   * fuelPerKm × (1 − 1/seats) per km; the flat fee is what that has to beat:
   *
   *   feePerTrip = fuelPerKm × (1 − 1/seats) × km
   *
   * Solved for km. On a 45 km/L two-wheeler that lands around 3.4 km, so a
   * 2 km pillion trip genuinely costs more than riding alone. Derived rather
   * than configured, so it stays true if mileage, fee or occupancy change.
   */
  const savingPerKm = fuelPerKm * (1 - 1 / seats);
  const soloBreakEvenKm =
    savingPerKm > 0 ? spec.feePerTrip / savingPerKm : Number.POSITIVE_INFINITY;

  return {
    daysPerMonth,
    tripsPerDay: FARE_MODEL.tripsPerDay,
    seats,
    soloMonthly: Math.round(soloMonthly),
    commercialMonthly: Math.round(commercialMonthly),
    rydinMonthly: Math.round(rydinMonthly),
    savedVsCommercialMonthly: Math.round(savedVsCommercial),
    savedVsCommercialYearly: Math.round(savedVsCommercial * 12),
    savedVsCommercialPercent:
      commercialMonthly > 0
        ? Math.round((savedVsCommercial / commercialMonthly) * 100)
        : 0,
    savedVsSoloMonthly: Math.round(savedVsSolo),
    savedVsSoloPercent: Math.round(savedVsSoloPercent),
    rydinPerKm,
    costsMoreThanSolo: rydinMonthly > soloMonthly,
    soloBreakEvenKm,
    // Thin enough not to be worth the coordination. A share of the bill, not a
    // fixed distance, because the crossover differs per vehicle.
    isLowValue: savedVsSoloPercent < 15,
  };
}

/**
 * Pooled saving shown in the telemetry strip, derived from the live count.
 *
 * Kept as a pure function of the commuter count so the two telemetry cells can
 * never contradict each other — and so the value is the same whether the count
 * came from the backend or from the local fallback.
 */
export function projectedPooledSavings(queueCount: number): number {
  return queueCount * QUEUE.projectedMonthlySavingPerCommuter;
}

/* ------------------------------------------------------------------ *
 * Pass summary helpers
 * ------------------------------------------------------------------ */

export function passIssuedOn(record: QueuePassRecord): string {
  const date = new Date(record.joinedAt);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Masks the email for display on the stub: `pri••••@nitb.ac.in`. */
export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return trimmed;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at);
  const keep = Math.min(3, Math.max(1, local.length - 1));
  return `${local.slice(0, keep)}${"•".repeat(Math.max(2, local.length - keep))}${domain}`;
}
