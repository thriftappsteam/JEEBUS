"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMemberAndHousehold } from "@/lib/hyetas/whoami";

export async function createInviteCode(formData: FormData) {
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/onboarding");
  const { member, household } = ctx!;

  const role = String(formData.get("suggested_role") ?? "kid");
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
