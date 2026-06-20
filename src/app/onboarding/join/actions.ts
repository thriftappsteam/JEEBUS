"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setIdentityCookies } from "@/lib/hyetas/identity";

export async function joinWithCode(formData: FormData) {
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  const memberName = String(formData.get("member_name") ?? "").trim();
  const avatarEmoji = String(formData.get("avatar_emoji") ?? "🦊");

  if (!code || code.length !== 6)
    redirect("/onboarding/join?error=Enter+the+6-letter+code");
  if (!memberName) redirect("/onboarding/join?error=Tell+me+your+name");

  const supabase = await createClient();
  // p_role is null on purpose: the INVITE decides the role now, not the
  // person typing. (Stops a kid joining as a parent.)
  const { data, error } = await supabase.rpc("redeem_invite_code", {
    p_code: code,
    p_member_name: memberName,
    p_role: null,
    p_avatar_emoji: avatarEmoji,
  });

  if (error) {
    const map: Record<string, string> = {
      invalid_code: "That code didn't match a family. Check the letters.",
      code_already_used:
        "That code's already been used. Ask for a fresh one.",
      code_expired: "That code's older than 14 days. Ask for a new one.",
    };
    const msg = map[error.message] ?? error.message;
    redirect(`/onboarding/join?error=${encodeURIComponent(msg)}&code=${code}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  const memberId = row?.member_id as string | undefined;
  const householdId = row?.household_id as string | undefined;
  if (!memberId || !householdId)
    redirect("/onboarding/join?error=Something+went+wrong");

  // Sign them in AND link this device to the household.
  await setIdentityCookies(memberId!, householdId!);

  // Everyone gets the short joiner wizard — it adapts to role + features
  // (kids pick a mascot, grown-ups get one open question, all skippable).
  redirect("/onboarding/profile");
}
