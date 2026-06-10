"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, createAuthClient } from "@/lib/supabase/server";
import { setIdentityCookies } from "@/lib/hyetas/identity";

export async function startNewFamily(formData: FormData) {
  const householdName = String(formData.get("household_name") ?? "").trim();
  const householdEmoji = String(formData.get("household_emoji") ?? "🏡");
  const ownerName = String(formData.get("owner_name") ?? "").trim();
  const ownerEmoji = String(formData.get("owner_emoji") ?? "🦊");
  const ownerEmail = String(formData.get("owner_email") ?? "")
    .trim()
    .toLowerCase();
  const currencySymbol = String(formData.get("currency_symbol") ?? "$");
  const currencyLabel = String(formData.get("currency_label") ?? "dollars");

  if (!householdName)
    redirect("/onboarding/start?error=Pick+a+household+name");
  if (!ownerName) redirect("/onboarding/start?error=Tell+me+your+name");
  if (!ownerEmail || !ownerEmail.includes("@"))
    redirect(
      "/onboarding/start?error=We+need+your+email+%E2%80%94+it%27s+how+you+get+back+in",
    );

  const supabase = await createClient();

  // The email is the recovery key — it can only belong to one member.
  const { data: existing } = await supabase
    .from("members")
    .select("id")
    .eq("email", ownerEmail)
    .maybeSingle();
  if (existing)
    redirect(
      "/onboarding/start?error=That+email+already+belongs+to+a+family+%E2%80%94+try+signing+in+instead",
    );

  const { data, error } = await supabase.rpc("create_household_with_owner", {
    p_household_name: householdName,
    p_emoji: householdEmoji,
    p_owner_name: ownerName,
    p_owner_role: "parent",
    p_currency_symbol: currencySymbol,
    p_currency_label: currencyLabel,
    p_owner_email: ownerEmail,
  });

  if (error) {
    const msg = error.message.includes("duplicate")
      ? "A family with that name already exists. Try another."
      : error.message;
    redirect(`/onboarding/start?error=${encodeURIComponent(msg)}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  const memberId = row?.member_id as string | undefined;
  const householdId = row?.household_id as string | undefined;

  if (!memberId || !householdId)
    redirect("/onboarding/start?error=Something+went+wrong");

  // Patch the owner emoji onto the new member.
  await supabase
    .from("members")
    .update({ avatar_emoji: ownerEmoji })
    .eq("id", memberId!);

  // Sign them in AND link this device to the new household.
  await setIdentityCookies(memberId!, householdId!);

  // Fire the account-verification magic link. Non-blocking: if it fails
  // (rate limit etc.) they can always send one later from /signin.
  try {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "https";
    const host = h.get("host") ?? "jeebus.vercel.app";
    const auth = await createAuthClient();
    await auth.auth.signInWithOtp({
      email: ownerEmail,
      options: {
        emailRedirectTo: `${proto}://${host}/auth/confirm`,
        shouldCreateUser: true,
      },
    });
  } catch {
    // ignore — recovery can be set up later
  }

  // Into the creator wizard: personalize first, then build the family.
  redirect("/onboarding/setup");
}

// (touched to sync the build sandbox — harmless, delete any time)
