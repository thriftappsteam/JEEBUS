"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMemberAndHousehold } from "@/lib/hyetas/whoami";

export async function markEarningPaid(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const next = formData.get("next") === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("kid_earnings").update({ paid: next }).eq("id", id);
  revalidatePath("/money");
}

/**
 * Add a manual earning to a kid. Multi-family safe: derives the household
 * from the signed-in member instead of looking up "McTonkin" by name.
 */
export async function addManualEarning(formData: FormData) {
  const kidId = String(formData.get("kid_id") ?? "");
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!kidId) redirect("/money/add?error=Pick+a+kid");
  if (!reason) redirect("/money/add?error=Tell+me+what+it's+for");
  const amount = parseFloat(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0)
    redirect("/money/add?error=Enter+an+amount+greater+than+0");

  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/money/add?error=Pick+a+member+first");
  const { member, household } = ctx!;

  const supabase = await createClient();
  const { error } = await supabase.from("kid_earnings").insert({
    household_id: household.id,
    earned_by_member_id: kidId,
    owed_by_member_id: member.id,
    chore_label: reason,
    amount,
  });

  if (error)
    redirect(`/money/add?error=${encodeURIComponent(error.message)}`);

  // Kick off a badge sweep for the receiving kid (first_dollar, etc.) and
  // a "helpful_helper" grant since this was a manual thank-you.
  await supabase.rpc("grant_badges_for_member", { p_member_id: kidId });
  // helpful_helper is granted on any manual thank-you earning. upsert
  // keyed on the UNIQUE (member_id, badge_code) means re-running is a
  // no-op (badge rows don't have mutable fields we care about).
  await supabase.from("member_badges").upsert(
    {
      household_id: household.id,
      member_id: kidId,
      badge_code: "helpful_helper",
    },
    { onConflict: "member_id,badge_code" },
  );

  revalidatePath("/money");
  redirect("/money?added=1");
}
