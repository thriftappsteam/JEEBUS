"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createAuthClient } from "@/lib/supabase/server";
import { getCurrentMemberAndHousehold } from "@/lib/hyetas/whoami";
import { hashPin, isValidPin } from "@/lib/hyetas/pin";

function isGrownUp(role: string): boolean {
  return role === "parent" || role === "partner";
}

async function requireCtx() {
  const ctx = await getCurrentMemberAndHousehold();
  if (!ctx) redirect("/");
  return ctx!;
}

/** Set (or change) a member's PIN. Self always allowed; others need a grown-up. */
export async function setMemberPin(formData: FormData) {
  const { member, household } = await requireCtx();
  const targetId = String(formData.get("member_id") ?? "");
  const pin = String(formData.get("pin") ?? "").trim();

  if (!isValidPin(pin))
    redirect("/account?error=PINs+are+4%E2%80%936+digits");
  if (targetId !== member.id && !isGrownUp(member.role))
    redirect("/account?error=Only+grown-ups+can+set+someone+else%27s+PIN");

  const supabase = await createClient();
  const { data: t } = await supabase
    .from("members")
    .select("id, household_id, name")
    .eq("id", targetId)
    .maybeSingle();
  const target =
    (t as { id: string; household_id: string; name: string } | null) ?? null;
  if (!target || target.household_id !== household.id)
    redirect("/account?error=That+person+isn%27t+in+this+family");

  const { hash, salt } = hashPin(pin);
  await supabase
    .from("members")
    .update({ pin_hash: hash, pin_salt: salt })
    .eq("id", targetId);

  revalidatePath("/account");
  redirect(`/account?saved=${encodeURIComponent(`PIN set for ${target!.name}`)}`);
}

/** Remove a member's PIN (back to tap-to-enter). Grown-ups only. */
export async function clearMemberPin(formData: FormData) {
  const { member, household } = await requireCtx();
  const targetId = String(formData.get("member_id") ?? "");

  if (!isGrownUp(member.role))
    redirect("/account?error=Only+grown-ups+can+remove+a+PIN");

  const supabase = await createClient();
  const { data: t } = await supabase
    .from("members")
    .select("id, household_id, name")
    .eq("id", targetId)
    .maybeSingle();
  const target =
    (t as { id: string; household_id: string; name: string } | null) ?? null;
  if (!target || target.household_id !== household.id)
    redirect("/account?error=That+person+isn%27t+in+this+family");

  await supabase
    .from("members")
    .update({ pin_hash: null, pin_salt: null })
    .eq("id", targetId);

  revalidatePath("/account");
  redirect(
    `/account?saved=${encodeURIComponent(`PIN removed for ${target!.name}`)}`,
  );
}

/**
 * Attach a recovery email to a grown-up member and send the verification
 * magic link. Self always allowed; setting someone else's needs a grown-up.
 */
export async function setMemberEmail(formData: FormData) {
  const { member, household } = await requireCtx();
  const targetId = String(formData.get("member_id") ?? "");
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@"))
    redirect("/account?error=Pop+in+a+real+email+address");
  if (targetId !== member.id && !isGrownUp(member.role))
    redirect("/account?error=Only+grown-ups+can+set+someone+else%27s+email");

  const supabase = await createClient();
  const { data: t } = await supabase
    .from("members")
    .select("id, household_id, name, role")
    .eq("id", targetId)
    .maybeSingle();
  const target =
    (t as {
      id: string;
      household_id: string;
      name: string;
      role: string;
    } | null) ?? null;
  if (!target || target.household_id !== household.id)
    redirect("/account?error=That+person+isn%27t+in+this+family");

  // One member per email, app-wide (it's the recovery key).
  const { data: clash } = await supabase
    .from("members")
    .select("id")
    .eq("email", email)
    .neq("id", targetId)
    .maybeSingle();
  if (clash)
    redirect("/account?error=That+email+already+belongs+to+someone");

  const { error } = await supabase
    .from("members")
    .update({ email })
    .eq("id", targetId);
  if (error) redirect(`/account?error=${encodeURIComponent(error.message)}`);

  // Send the verification magic link (non-blocking).
  try {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "https";
    const host = h.get("host") ?? "jeebus.vercel.app";
    const auth = await createAuthClient();
    await auth.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${proto}://${host}/auth/confirm`,
        shouldCreateUser: true,
      },
    });
  } catch {
    // fine — they can magic-link later from /signin
  }

  revalidatePath("/account");
  redirect(
    `/account?saved=${encodeURIComponent(
      `Magic link sent to ${email} — tap it to verify`,
    )}`,
  );
}

/** Update which features the household uses (drives the nav). Grown-ups only. */
export async function setHouseholdFeatures(formData: FormData) {
  const { member, household } = await requireCtx();
  if (!isGrownUp(member.role))
    redirect("/account?error=Only+grown-ups+can+change+features");

  const picked = new Set(formData.getAll("features").map((v) => String(v)));
  if (picked.size === 0)
    redirect("/account?error=Keep+at+least+one+feature+on");

  const supabase = await createClient();
  await supabase
    .from("households")
    .update({
      features: {
        chores: picked.has("chores"),
        meals: picked.has("meals"),
        grocery: picked.has("grocery"),
        money: picked.has("money"),
        shifts: picked.has("shifts"),
      },
    })
    .eq("id", household.id);

  revalidatePath("/", "layout");
  redirect("/account?saved=Features+updated");
}
