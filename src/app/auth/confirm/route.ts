// Magic-link landing. Verifies the Supabase Auth token, links the auth user
// to their member row (first time), then sets the device + member cookies.
// Handles both the token_hash template style and the PKCE ?code= style so it
// works regardless of how the Supabase email template is configured.

import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient, createAuthClient } from "@/lib/supabase/server";
import { setIdentityCookies } from "@/lib/hyetas/identity";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "email") as EmailOtpType;
  const code = url.searchParams.get("code");

  const auth = await createAuthClient();
  let email: string | null = null;
  let authUserId: string | null = null;

  if (tokenHash) {
    const { data, error } = await auth.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error && data.user) {
      email = data.user.email ?? null;
      authUserId = data.user.id;
    }
  } else if (code) {
    const { data, error } = await auth.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      email = data.user.email ?? null;
      authUserId = data.user.id;
    }
  }

  if (!email) {
    return NextResponse.redirect(
      new URL(
        "/signin?error=That+link+didn%27t+work+%E2%80%94+it+may+have+expired.+Send+a+fresh+one.",
        request.url,
      ),
      { status: 303 },
    );
  }

  const supabase = await createClient();
  const { data: memberRow } = await supabase
    .from("members")
    .select("id, household_id, auth_user_id")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  const member =
    (memberRow as {
      id: string;
      household_id: string;
      auth_user_id: string | null;
    } | null) ?? null;

  if (!member) {
    return NextResponse.redirect(
      new URL(
        "/signin?error=Signed+in%2C+but+no+family+uses+that+email+yet.",
        request.url,
      ),
      { status: 303 },
    );
  }

  // First magic-link click: remember which auth user owns this member.
  if (!member.auth_user_id && authUserId) {
    await supabase
      .from("members")
      .update({ auth_user_id: authUserId })
      .eq("id", member.id);
  }

  await setIdentityCookies(member.id, member.household_id);
  return NextResponse.redirect(new URL("/?welcome=1", request.url), {
    status: 303,
  });
}
