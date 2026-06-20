/**
 * Household & current-member helpers.
 *
 * The app authenticates with a single cookie `hyetas_member_id` (a UUID).
 * From that we derive the member row and the household they belong to.
 * Every server action that touches household data should use these helpers
 * instead of hardcoding household name lookups (which used to assume the
 * one and only "McTonkin" family).
 */

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type CurrentMember = {
  id: string;
  household_id: string;
  name: string;
  role: "parent" | "partner" | "teen" | "kid" | "other";
  avatar_emoji: string | null;
  money_mascot: string | null;
  favourite_foods: string[] | null;
  onboarded_at: string | null;
};

export type CurrentHousehold = {
  id: string;
  name: string;
  emoji: string | null;
  timezone: string;
  currency_symbol: string;
  currency_label: string;
  onboarded_at: string | null;
  features: Record<string, boolean> | null;
};

/** Read the cookie. Pure string, no DB hit. */
export async function getCurrentMemberId(): Promise<string | null> {
  const c = await cookies();
  return c.get("hyetas_member_id")?.value ?? null;
}

/**
 * Load the current member row from the cookie. Returns null if no cookie
 * or the cookie points at a stale/deleted member.
 */
export async function getCurrentMember(): Promise<CurrentMember | null> {
  const memberId = await getCurrentMemberId();
  if (!memberId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select(
      "id, household_id, name, role, avatar_emoji, money_mascot, favourite_foods, onboarded_at",
    )
    .eq("id", memberId)
    .maybeSingle();
  return (data as CurrentMember | null) ?? null;
}

/** Convenience: member + household in one call. */
export async function getCurrentMemberAndHousehold(): Promise<{
  member: CurrentMember;
  household: CurrentHousehold;
} | null> {
  const member = await getCurrentMember();
  if (!member) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("households")
    .select(
      "id, name, emoji, timezone, currency_symbol, currency_label, onboarded_at, features",
    )
    .eq("id", member.household_id)
    .maybeSingle();
  if (!data) return null;
  return { member, household: data as CurrentHousehold };
}

/** True if a household already exists in the DB. Used by the landing page. */
export async function anyHouseholdExists(): Promise<boolean> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("households")
    .select("id", { count: "exact", head: true });
  return (count ?? 0) > 0;
}

/**
 * Which household this DEVICE is linked to (set when a family is created,
 * an invite is redeemed, or a parent magic-links in). Distinct from the
 * member cookie: it survives "switch user" so the picker stays scoped to
 * one family and never lists strangers.
 */
export async function getDeviceHouseholdId(): Promise<string | null> {
  const c = await cookies();
  return c.get("hyetas_household_id")?.value ?? null;
}

/** Load the device-linked household row, or null. */
export async function getDeviceHousehold(): Promise<CurrentHousehold | null> {
  const householdId = await getDeviceHouseholdId();
  if (!householdId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("households")
    .select(
      "id, name, emoji, timezone, currency_symbol, currency_label, onboarded_at, features",
    )
    .eq("id", householdId)
    .maybeSingle();
  return (data as CurrentHousehold | null) ?? null;
}
