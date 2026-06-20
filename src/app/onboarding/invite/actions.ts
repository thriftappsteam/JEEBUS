"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMemberAndHousehold } from "@/lib/hyetas/whoami";

const MEMBER_ROLES = ["parent", "partner", "teen", "kid", "other"];

export async function createInviteCode(formData: FormData) {
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/onboarding");
  const { member, household } = ctx!;

  const roleRaw = String(formData.get("suggested_role") ?? "kid");
  const role = MEMBER_ROLES.includes(roleRaw) ? roleRaw : "kid";
  const name = String(formData.get("suggested_name") ?? "").trim() || null;

  const supabase = await createClient();

  // Generate up to 5 codes until we find one that's unique. Collision is
  // astronomically unlikely (32^6 ≈ 1B) but be defensive.
  for (let i = 0; i < 5; i++) {
    const { data: codeRow } = await supabase.rpc("generate_invite_code");
    const code = String(codeRow ?? "").toUpperCase();
    if (!code) continue;

    const { error } = await supabase.from("household_invite_codes").insert({
      code,
      household_id: household.id,
      suggested_role: role,
      suggested_name: name,
      created_by_member_id: member.id,
    });

    if (!error) {
      revalidatePath("/onboarding/invite");
      redirect("/onboarding/invite");
    }
  }
  redirect("/onboarding/invite?error=Could+not+generate+a+code");
}

/**
 * Add a family member directly — for kids (or anyone) who don't have their
 * own device or email. They appear on the family picker immediately; they
 * can "claim" a device later via invite link or by tapping their face.
 */
export async function createMemberDirectly(formData: FormData) {
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/onboarding");
  const { member, household } = ctx!;

  if (member.role !== "parent" && member.role !== "partner") {
    redirect("/onboarding/invite?error=Only+grown-ups+can+add+people");
  }

  const name = String(formData.get("member_name") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "kid");
  const role = MEMBER_ROLES.includes(roleRaw) ? roleRaw : "kid";
  const avatar = String(formData.get("avatar_emoji") ?? "🐯");

  if (!name) redirect("/onboarding/invite?error=Give+them+a+name");

  const supabase = await createClient();
  const { error } = await supabase.from("members").insert({
    household_id: household.id,
    name,
    role,
    avatar_emoji: avatar,
    onboarded_at: new Date().toISOString(),
  });

  if (error) {
    redirect(
      `/onboarding/invite?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/onboarding/invite");
  redirect(`/onboarding/invite?added=${encodeURIComponent(name)}`);
}
