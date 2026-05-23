"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function markEarningPaid(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const next = formData.get("next") === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("kid_earnings").update({ paid: next }).eq("id", id);
  revalidatePath("/money");
}

/**
 * Add a manual earning to a kid for ad-hoc help that wasn't a tracked chore.
 * Defaults: earned_date = today, paid = false, owed_by = the signed-in member
 * (the parent adding the entry). related_completion_id stays null so we can
 * tell manual entries apart from auto-logged ones.
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

  const supabase = await createClient();

  // Find the household — there's only one (McTonkin) but query for it cleanly.
  const { data: household } = await supabase
    .from("households")
    .select("id")
    .eq("name", "McTonkin")
    .maybeSingle();
  if (!household)
    redirect("/money/add?error=Household+not+found");

  // Default the "owed by" parent to whoever's signed in (cookie-based member).
  const cookieStore = await cookies();
  const signedInId = cookieStore.get("hyetas_member_id")?.value ?? null;

  const { error } = await supabase.from("kid_earnings").insert({
    household_id: household.id,
    earned_by_member_id: kidId,
    owed_by_member_id: signedInId,
    chore_label: reason,
    amount,
    // earned_date and paid use the column defaults (today, false).
  });

  if (error)
    redirect(`/money/add?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/money");
  redirect("/money?added=1");
}
