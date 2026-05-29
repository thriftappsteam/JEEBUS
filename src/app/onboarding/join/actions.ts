"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function joinWithCode(formData: FormData) {
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  const memberName = String(formData.get("member_name") ?? "").trim();
  const role = String(formData.get("role") ?? "kid");
  const avatarEmoji = String(formData.get("avatar_emoji") ?? "🦊");

  if (!code || code.length !== 6)
    redirect("/onboarding/join?error=Enter+the+6-letter+code");
  if (!memberName) redirect("/onboarding/join?error=Tell+me+your+name");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_invite_code", {
    p_code: code,
    p_member_name: memberName,
    p_role: role,
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
  if (!memberId) redirect("/onboarding/join?error=Something+went+wrong");

  const c = await cookies();
  c.set("hyetas_member_id", memberId!, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: ONE_YEAR,
    path: "/",
  });

  // Kid/teen go through the playful profile quiz. Parents skip to home.
  if (role === "kid" || role === "teen") {
    redirect("/onboarding/profile");
  }
  redirect("/?welcome=1");
}
