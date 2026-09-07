# Firestore Security Specification: Rydin Waitlist

## 1. Data Invariants
1. A waitlist entry must contain exactly the 8 specified fields: `username`, `email`, `route`, `gender`, `women_only_preference`, `queue_position`, `referral_code`, and `joined_at`.
2. No ghost fields or shadow fields may be injected.
3. Once created, a waitlist entry is immutable (`update: false`, `delete: false`).
4. Timestamps must be set strictly to `request.time`.
5. String fields must satisfy length bounds (e.g., username <= 100, email <= 150, referral_code <= 50).
6. The `queue_position` must be a valid number >= 200.
7. The `women_only_preference` must be a boolean.

## 2. The "Dirty Dozen" Payloads (Must be rejected)
1. **Ghost Field Injection**: Adding `role: "admin"` or `vip: true` on create -> Rejected (exact key count and key set enforced).
2. **Client Timestamp Manipulation**: Client passes custom epoch timestamp for `joined_at` instead of `request.time` -> Rejected.
3. **Queue Position Tampering**: Negative or invalid `queue_position` (e.g. -5) -> Rejected.
4. **Denial of Wallet Oversized String**: Username payload of 50KB -> Rejected (max 100 chars).
5. **Denial of Wallet Oversized Email**: Email payload of 10KB -> Rejected (max 150 chars).
6. **Missing Required Fields**: Payload without `email` or `referral_code` -> Rejected.
7. **Type Inversion (boolean as string)**: `women_only_preference: "yes"` instead of `boolean` -> Rejected.
8. **Unauthorized Update**: Attempting to update `queue_position` or `username` on existing document -> Rejected (`allow update: if false`).
9. **Unauthorized Delete**: Attempting to delete a waitlist record -> Rejected (`allow delete: if false`).
10. **Arbitrary Collection Write**: Writing to an arbitrary collection like `/admins` or `/users` -> Rejected (Global catch-all deny).
11. **Path Traversal / Malformed Document ID**: Injecting document ID with special characters -> Rejected by `isValidId`.
12. **Non-Numeric Queue Position**: Passing `queue_position: "1"` (string) instead of number -> Rejected.
