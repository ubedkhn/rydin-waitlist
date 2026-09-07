import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import type { Gender } from "@/lib/rydin/types";

export interface FirestoreWaitlistUser {
  username: string;
  email: string;
  route: string;
  gender: string;
  women_only_preference: boolean;
  queue_position: number;
  referral_code: string;
  joined_at: Timestamp | null;
}

export interface FirestoreSubmitInput {
  username: string;
  email: string;
  route: string;
  gender: Gender | string;
  women_only_preference: boolean;
}

export interface FirestoreSubmitResult {
  ok: boolean;
  alreadyJoined: boolean;
  queue_position: number;
  referral_code: string;
  docId: string;
  username: string;
  email: string;
  route: string;
  gender: string;
  women_only_preference: boolean;
  joined_at?: string;
}

/**
 * Generate a safe Firestore document ID for a given user email to enable
 * single-document lookups (getDoc) under anti-scraping `allow list: if false` rules.
 */
export function emailToDocId(email: string): string {
  return "usr_" + encodeURIComponent(email.toLowerCase().trim()).replace(/%/g, "_");
}

/**
 * Auto-generate a unique code formatted as RYDIN-{FIRSTNAME}{RANDOM_3_DIGITS}
 */
export function generateReferralCode(username: string): string {
  const parts = username.trim().split(/[\s_.-]+/);
  const rawFirst = parts[0] || "VIP";
  const firstName = rawFirst.toUpperCase().replace(/[^A-Z0-9]/g, "") || "VIP";
  const random3Digits = Math.floor(100 + Math.random() * 900);
  return `RYDIN-${firstName}${random3Digits}`;
}

/**
 * Format gender to match security rule: `gender in ['Male', 'Female', 'Other']`
 */
function normalizeGenderForRules(gender: string): "Male" | "Female" | "Other" {
  const lower = gender.trim().toLowerCase();
  if (lower === "female") return "Female";
  if (lower === "other") return "Other";
  return "Male";
}

/**
 * Normalizes username to satisfy `username.size() >= 2 && username.size() <= 60`
 */
function normalizeUsernameForRules(username: string): string {
  const trimmed = username.trim();
  if (trimmed.length < 2) {
    return trimmed.padEnd(2, "_");
  }
  return trimmed.slice(0, 60);
}

/**
 * Checks for existing registration by email via single-document read (allow get: if true),
 * and either returns the existing pass details or writes the new entry to Firestore.
 */
export async function submitToFirestoreWaitlist(
  input: FirestoreSubmitInput,
): Promise<FirestoreSubmitResult> {
  const cleanEmail = input.email.trim().toLowerCase();
  const cleanUsername = normalizeUsernameForRules(input.username);
  const cleanRoute = input.route.trim();
  const cleanGender = normalizeGenderForRules(input.gender || "male");
  const womenOnlyPref = Boolean(input.women_only_preference);

  const docId = emailToDocId(cleanEmail);
  const userDocRef = doc(db, "waitlist_users", docId);

  // 1. Duplicate Prevention: Single document read via `getDoc` (allowed by `allow get: if true`)
  try {
    const existingSnap = await getDoc(userDocRef);
    if (existingSnap.exists()) {
      const data = existingSnap.data() as FirestoreWaitlistUser;
      return {
        ok: true,
        alreadyJoined: true,
        queue_position: data.queue_position,
        referral_code: data.referral_code,
        docId: existingSnap.id,
        username: data.username,
        email: data.email,
        route: data.route,
        gender: data.gender,
        women_only_preference: data.women_only_preference,
        joined_at: data.joined_at?.toDate ? data.joined_at.toDate().toISOString() : new Date().toISOString(),
      };
    }
  } catch (error) {
    console.warn("Could not check existing doc by ID:", error);
  }

  // 2. Queue Position Math: 200 + currentCount + 1
  let currentCount = 0;
  try {
    const waitlistCol = collection(db, "waitlist_users");
    const countSnapshot = await getCountFromServer(waitlistCol);
    currentCount = countSnapshot.data().count;
  } catch {
    // If collection listing/counting is blocked by anti-scraping rules, fallback to random seed offset
    currentCount = Math.floor(Math.random() * 20) + 1;
  }

  const nextPosition = 200 + currentCount + 1;
  const referral_code = generateReferralCode(cleanUsername);

  // 3. Document insertion strictly satisfying the new security rules:
  // - keys().hasAll(['username', 'email', 'route', 'gender', 'queue_position', 'referral_code', 'joined_at'])
  // - username.size() >= 2 && username.size() <= 60
  // - email.matches('^.+@.+\\..+$')
  // - gender in ['Male', 'Female', 'Other']
  // - queue_position is number && >= 200
  // - women_only_preference is bool
  const newDocPayload = {
    username: cleanUsername,
    email: cleanEmail,
    route: cleanRoute,
    gender: cleanGender,
    women_only_preference: womenOnlyPref,
    queue_position: nextPosition,
    referral_code,
    joined_at: serverTimestamp(),
  };

  try {
    await setDoc(userDocRef, newDocPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `waitlist_users/${docId}`);
  }

  return {
    ok: true,
    alreadyJoined: false,
    queue_position: nextPosition,
    referral_code,
    docId,
    username: cleanUsername,
    email: cleanEmail,
    route: cleanRoute,
    gender: cleanGender,
    women_only_preference: womenOnlyPref,
    joined_at: new Date().toISOString(),
  };
}

/**
 * Query waitlist_users by email for checking spot status (using single-doc read `allow get: if true`)
 */
export async function lookupFirestoreWaitlistUser(
  email: string,
): Promise<FirestoreSubmitResult | null> {
  const cleanEmail = email.trim().toLowerCase();
  const docId = emailToDocId(cleanEmail);
  const userDocRef = doc(db, "waitlist_users", docId);

  try {
    const snapshot = await getDoc(userDocRef);
    if (!snapshot.exists()) return null;

    const data = snapshot.data() as FirestoreWaitlistUser;
    return {
      ok: true,
      alreadyJoined: true,
      queue_position: data.queue_position,
      referral_code: data.referral_code,
      docId: snapshot.id,
      username: data.username,
      email: data.email,
      route: data.route,
      gender: data.gender,
      women_only_preference: data.women_only_preference,
      joined_at: data.joined_at?.toDate ? data.joined_at.toDate().toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    console.warn("lookupFirestoreWaitlistUser error:", error);
    return null;
  }
}

/**
 * Live commuter count from Firestore
 */
export async function getLiveFirestoreCount(): Promise<number> {
  try {
    const waitlistCol = collection(db, "waitlist_users");
    const countSnapshot = await getCountFromServer(waitlistCol);
    return 200 + countSnapshot.data().count;
  } catch {
    return 200;
  }
}
