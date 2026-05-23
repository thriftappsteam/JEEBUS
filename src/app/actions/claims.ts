"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * Kid asks to take a chore off someone for $X. Inserts a pending claim row.
 * The chore's assignee doesn't change yet — that happens on parent approval.
 */
export async function requestChoreClaim(formData: FormData) {
  const assignmentId = String(formData.get("assignment_id") ?? "");
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!assignmentId) redirect("/?error=Missing+assignment");
  const amount = parseFloat(amountRaw);
  if (!Number.isFinite(amount) || amount < 0)
    redirect("/?error=Enter+a+valid+amount");

  const supabase = await createClient();
  const cookieStore = await cookies();
  const memberId = cookieStore.get("hyetas_member_id")?.value ?? null;
  if (!memberId) redirect("/?error=Sign+in+first");

  // Look up the assignment so we can record the original assignee.
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, member_id, status")
    .eq("id", assignmentId)
    .maybeSingle();
  if (!assignment) redirect("/?error=Chore+not+found");
  if (assignment.status !== "pending")
    redirect("/?error=Chore+is+no+longer+pending");
  if (assignment.member_id === memberId)
    redirect("/?error=That+chore+is+already+yours");

  // Don't allow duplicate pending claims by the same kid on the same assignment.
  const { data: existing } = await supabase
    .from("chore_claims")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("requested_by_member_id", memberId)
    .eq("status", "pending")
    .maybeSingle();
  if (existing) redirect("/?claim_resubmitted=1");

  const { error } = await supabase.from("chore_claims").insert({
    assignment_id: assignmentId,
    requested_by_member_id: memberId,
    original_assignee_id: assignment.member_id,
    requested_amount: amount,
    notes,
  });

  if (error) redirect(`/?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/");
  redirect("/?claim_sent=1");
}

/**
 * Parent approves a pending claim:
 * - Marks the claim approved
 * - Reassigns the underlying assignment to the kid
 * - Auto-declines any other pending claims on the same assignment
 */
export async function approveChoreClaim(formData: FormData) {
  const claimId = String(formData.get("claim_id") ?? "");
  if (!claimId) redirect("/?error=Missing+claim");

  const supabase = await createClient();
  const cookieStore = await cookies();
  const deciderId = cookieStore.get("hyetas_member_id")?.value ?? null;

  const { data: claim } = await supabase
    .from("chore_claims")
    .select("id, assignment_id, requested_by_member_id, status")
    .eq("id", claimId)
    .maybeSingle();
  if (!claim) redirect("/?error=Claim+not+found");
  if (claim.status !== "pending")
    redirect("/?error=Claim+already+decided");

  const decidedAt = new Date().toISOString();

  // 1. Approve this claim
  await supabase
    .from("chore_claims")
    .update({
      status: "approved",
      decided_at: decidedAt,
      decided_by_member_id: deciderId,
    })
    .eq("id", claimId);

  // 2. Reassign the chore to the kid
  await supabase
    .from("assignments")
    .update({ member_id: claim.requested_by_member_id })
    .eq("id", claim.assignment_id);

  // 3. Auto-decline any other pending claims on the same assignment
  await supabase
    .from("chore_claims")
    .update({
      status: "declined",
      decided_at: decidedAt,
      decided_by_member_id: deciderId,
    })
    .eq("assignment_id", claim.assignment_id)
    .eq("status", "pending");

  revalidatePath("/");
  redirect("/?claim_approved=1");
}

/**
 * Parent declines a pending claim. Assignment stays where it is.
 */
export async function declineChoreClaim(formData: FormData) {
  const claimId = String(formData.get("claim_id") ?? "");
  if (!claimId) redirect("/?error=Missing+claim");

  const supabase = await createClient();
  const cookieStore = await cookies();
  const deciderId = cookieStore.get("hyetas_member_id")?.value ?? null;

  await supabase
    .from("chore_claims")
    .update({
      status: "declined",
      decided_at: new Date().toISOString(),
      decided_by_member_id: deciderId,
    })
    .eq("id", claimId)
    .eq("status", "pending");

  revalidatePath("/");
  redirect("/?claim_declined=1");
}
