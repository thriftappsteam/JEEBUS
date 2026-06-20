"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, createAuthClient } from "@/lib/supabase/server";

/** Origin of the current request (works on prod + preview + local). */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "jeebus.vercel.app";
  return `${proto}://${host}`;
}

/**
 * Email a magic sign-in link. Only emails that belong to an existing member
 * can request one — strangers get a friendly nudge toward starting a family.
 */
export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    redirect("/signin?error=Pop+in+a+real+email+address");
  }

  // Is this email attached to a member? (Data client — not auth.)
  const supabase = await createClient();
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!member) {
    redirect(
      "/signin?error=No+family+found+for+that+email.+Start+one%2C+or+ask+for+an+invite.",
    );
  }

  const origin = await requestOrigin();
  const auth = await createAuthClient();
  const { error } = await auth.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    redirect(`/signin?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/signin?sent=${encodeURIComponent(email)}`);
}
