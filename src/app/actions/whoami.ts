"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember, getDeviceHouseholdId } from "@/lib/hyetas/whoami";
import { setIdentityCookies } from "@/lib/hyetas/identity";
import { verifyPin } from "@/lib/hyetas/pin";

/**
 * "I am this person" — from the household-scoped picker.
 *
 * Authorization: the target member must belong to the household this device
 * is linked to (household cookie), or to the household of whoever is
 * currently signed in on this device. A device with neither cookie can't
 * enter as anyone — it has to join, create, or magic-link first.
 *
 * If the member has a PIN set, it must match.
 */
export async function enterAs(formData: FormData) {
  const memberId = String(formData.get("member_id") ?? "");
  const pin = String(formData.get("pin") ?? "").trim();
  if (!memberId) redirect("/");

  // Which household is this device allowed to act in?
  const deviceHouseholdId = await getDeviceHouseholdId();
  const current = await getCurrentMember();
  const allowedHouseholdId = deviceHouseholdId ?? current?.household_id ?? null;
  if (!allowedHouseholdId) redirect("/");

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("members")
    .select("id, household_id, pin_hash, pin_salt")
    .eq("id", memberId)
    .maybeSingle();

  const member =
    (target as {
      id: string;
      household_id: string;
      pin_hash: string | null;
      pin_salt: string | null;
    } | null) ?? null;

  if (!member || member.household_id !== allowedHouseholdId) {
    redirect("/?error=That+person+isn%27t+in+this+family");
  }

  if (member!.pin_hash && member!.pin_salt) {
    if (!pin || !verifyPin(pin, member!.pin_salt, member!.pin_hash)) {
      redirect(`/?pin_for=${member!.id}&error=Wrong+PIN+—+try+again`);
    }
  }

  await setIdentityCookies(member!.id, member!.household_id);
  revalidatePath("/");
  redirect("/");
}
