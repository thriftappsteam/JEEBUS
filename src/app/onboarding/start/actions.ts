"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function startNewFamily(formData: FormData) {
  const householdName = String(formData.get("household_name") ?? "").trim();
  const householdEmoji = String(formData.get("household_emoji") ?? "🏡");
  const ownerName = String(formData.get("owner_name") ?? "").trim();
  const ownerEmoji = String(formData.get("owner_emoji") ?? "🦊");
  const currencySymbol = String(formData.get("currency_symbol") ?? "$");
  const currencyLabel = String(formData.get("currency_label") ?? "dollars");

  if (!householdName)
    redirect("/onboarding/start?error=Pick+a+household+name");
  if (!ownerName) redirect("/onboarding/start?error=Tell+me+your+name");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_household_with_owner", {
    p_household_name: householdName,
    p_emoji: householdEmoji,
    p_owner_name: ownerName,
    p_owner_role: "parent",
    p_currency_symbol: currencySymbol,
    p_currency_label: currencyLabel,
  });

  if (error) {
    const msg = error.message.includes("duplicate")
      ? "A family with that name already exists. Try another."
      : error.message;
    redirect(`/onboarding/start?error=${encodeURIComponent(msg)}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  const memberId = row?.member_id as string | undefined;

  if (!memberId) redirect("/onboarding/start?error=Something+went+wrong");

  // Patch the owner emoji onto the new member.
  await supabase
    .from("members")
    .update({ avatar_emoji: ownerEmoji })
    .eq("id", memberId);

  // Set the cookie so we treat them as logged in.
  const c = await cookies();
  c.set("hyetas_member_id", memberId!, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: ONE_YEAR,
    path: "/",
  });

  redirect("/onboarding/invite?fresh=1");
}
