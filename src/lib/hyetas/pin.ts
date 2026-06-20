/**
 * Member PIN hashing. PINs are 4–6 digits, scrypt-hashed with a per-member
 * salt. PINs are a household-level convenience lock (kids switching on a
 * shared device), not bank-grade security — email magic link is the real
 * account anchor for parents.
 */

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const PIN_PATTERN = /^\d{4,6}$/;

export function isValidPin(pin: string): boolean {
  return PIN_PATTERN.test(pin);
}

export function hashPin(pin: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin.normalize("NFKC"), salt, 32).toString("hex");
  return { hash, salt };
}

export function verifyPin(
  pin: string,
  salt: string,
  expectedHash: string,
): boolean {
  try {
    const actual = scryptSync(pin.normalize("NFKC"), salt, 32);
    const expected = Buffer.from(expectedHash, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
