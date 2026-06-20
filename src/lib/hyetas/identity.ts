/**
 * Device identity cookies.
 *
 * Two cookies, two jobs:
 * - `hyetas_member_id`    — WHO is using the app right now (the session).
 * - `hyetas_household_id` — which FAMILY this device belongs to. Survives
 *   "switch user", so the picker can show the family without ever exposing
 *   other households. A device earns this cookie only by: creating a family,
 *   redeeming an invite, or a parent signing in via email magic link.
 *
 * Only call these from Server Actions or Route Handlers (Next.js can't set
 * cookies from Server Components).
 */

import { cookies } from "next/headers";

export const MEMBER_COOKIE = "hyetas_member_id";
export const HOUSEHOLD_COOKIE = "hyetas_household_id";

const ONE_YEAR = 60 * 60 * 24 * 365;

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax",
  secure: true,
  maxAge: ONE_YEAR,
  path: "/",
} as const;

/** Mark this device as belonging to a household AND sign in a member. */
export async function setIdentityCookies(
  memberId: string,
  householdId: string,
): Promise<void> {
  const c = await cookies();
  c.set(MEMBER_COOKIE, memberId, COOKIE_OPTS);
  c.set(HOUSEHOLD_COOKIE, householdId, COOKIE_OPTS);
}

/** Link the device to a household without signing anyone in. */
export async function setHouseholdCookie(householdId: string): Promise<void> {
  const c = await cookies();
  c.set(HOUSEHOLD_COOKIE, householdId, COOKIE_OPTS);
}

/** Sign the current member out but keep the device's household link. */
export async function clearMemberCookie(): Promise<void> {
  const c = await cookies();
  c.delete(MEMBER_COOKIE);
}
